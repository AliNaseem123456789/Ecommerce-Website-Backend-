import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  removeUploadedImage,
  slugify,
  uploadImageToBucket,
  UploadedImage,
} from '../common/image-upload';
import {
  CreateBrandDto,
  CreateCollectionDto,
  CreatePromotionDto,
  UpdateBrandDto,
  UpdateCollectionDto,
  UpdatePromotionDto,
  UpsertSectionDto,
} from './dto/content.dto';

/** Section types the storefront knows how to render. */
export const SECTION_TYPES = [
  'promo_grid',
  'collection_grid',
  'product_rail',
  'shop_by_price',
  'brand_strip',
  'testimonials',
  'recently_viewed',
] as const;

/** Sources a product_rail section can draw from. */
export const RAIL_SOURCES = [
  'best_sellers',
  'new_arrivals',
  'top_rated',
  'most_wishlisted',
  'collection',
] as const;

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------- brands ------------------------------- */

  listBrands() {
    return this.prisma.brands.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  listFeaturedBrands() {
    return this.prisma.brands.findMany({
      where: { featured: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  async getBrandBySlug(slug: string) {
    const brand = await this.prisma.brands.findUnique({ where: { slug } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async createBrand(dto: CreateBrandDto) {
    const slug = await this.uniqueSlug('brands', slugify(dto.name));
    return this.prisma.brands.create({ data: { ...dto, slug } as never });
  }

  async updateBrand(id: number, dto: UpdateBrandDto) {
    await this.requireBrand(id);
    return this.prisma.brands.update({
      where: { brand_id: id },
      data: dto as never,
    });
  }

  async deleteBrand(id: number) {
    const brand = await this.requireBrand(id);
    // products.brand_id is ON DELETE SET NULL, so products survive.
    await this.prisma.brands.delete({ where: { brand_id: id } });
    await removeUploadedImage(brand.logo_url);
    return { ok: true };
  }

  async uploadBrandLogo(id: number, file: UploadedImage) {
    const brand = await this.requireBrand(id);
    const url = await uploadImageToBucket(file, `brand-${id}`);
    const updated = await this.prisma.brands.update({
      where: { brand_id: id },
      data: { logo_url: url },
    });
    await removeUploadedImage(brand.logo_url);
    return updated;
  }

  private async requireBrand(id: number) {
    const brand = await this.prisma.brands.findUnique({
      where: { brand_id: id },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  /* ----------------------------- collections ---------------------------- */

  listCollections() {
    return this.prisma.collections.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { collection_products: true } } },
    });
  }

  /** Active collections inside their date window, for the storefront. */
  listLiveCollections() {
    const now = new Date();
    return this.prisma.collections.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
          { OR: [{ expires_at: null }, { expires_at: { gte: now } }] },
        ],
      },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { collection_products: true } } },
    });
  }

  async getCollectionBySlug(slug: string) {
    const collection = await this.prisma.collections.findUnique({
      where: { slug },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    const products = await this.collectionProducts(collection.collection_id);
    return { ...collection, products };
  }

  async collectionProducts(collectionId: number) {
    const rows = await this.prisma.collection_products.findMany({
      where: { collection_id: collectionId },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      include: {
        products: {
          include: {
            product_images: {
              take: 2,
              orderBy: [
                { is_primary: 'desc' },
                { sort_order: 'asc' },
                { id: 'asc' },
              ],
            },
          },
        },
      },
    });

    return rows
      .filter((row) => row.products)
      .map((row) => {
        const product = row.products as Record<string, unknown> & {
          product_images?: { url: string }[];
          image_url?: string | null;
        };
        const gallery = (product.product_images || []).map((img) => img.url);
        const images = gallery.length
          ? gallery
          : product.image_url
            ? [product.image_url]
            : [];
        const { product_images, ...rest } = product;
        void product_images;
        return { ...rest, images };
      });
  }

  async createCollection(dto: CreateCollectionDto) {
    const slug = await this.uniqueSlug('collections', slugify(dto.name));
    return this.prisma.collections.create({ data: { ...dto, slug } as never });
  }

  async updateCollection(id: number, dto: UpdateCollectionDto) {
    await this.requireCollection(id);
    return this.prisma.collections.update({
      where: { collection_id: id },
      data: dto as never,
    });
  }

  async deleteCollection(id: number) {
    const collection = await this.requireCollection(id);
    await this.prisma.collections.delete({ where: { collection_id: id } });
    await removeUploadedImage(collection.image_url);
    return { ok: true };
  }

  async uploadCollectionImage(id: number, file: UploadedImage) {
    const collection = await this.requireCollection(id);
    const url = await uploadImageToBucket(file, `collection-${id}`);
    const updated = await this.prisma.collections.update({
      where: { collection_id: id },
      data: { image_url: url },
    });
    await removeUploadedImage(collection.image_url);
    return updated;
  }

  /** Replaces a collection's membership in one go, preserving the given order. */
  async setCollectionProducts(id: number, productIds: number[]) {
    await this.requireCollection(id);

    const existing = await this.prisma.products.findMany({
      where: { product_id: { in: productIds } },
      select: { product_id: true },
    });
    const valid = new Set(existing.map((row) => row.product_id));
    const missing = productIds.filter((productId) => !valid.has(productId));
    if (missing.length) {
      throw new BadRequestException(
        `These products do not exist: ${missing.join(', ')}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.collection_products.deleteMany({
        where: { collection_id: id },
      }),
      ...productIds.map((productId, index) =>
        this.prisma.collection_products.create({
          data: { collection_id: id, product_id: productId, sort_order: index },
        }),
      ),
    ]);

    return this.collectionProducts(id);
  }

  private async requireCollection(id: number) {
    const collection = await this.prisma.collections.findUnique({
      where: { collection_id: id },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return collection;
  }

  /* ------------------------------ promotions ---------------------------- */

  listPromotions() {
    return this.prisma.promotions.findMany({
      orderBy: [{ sort_order: 'asc' }, { promotion_id: 'asc' }],
    });
  }

  /** Active promotions inside their date window, for the storefront. */
  listLivePromotions() {
    const now = new Date();
    return this.prisma.promotions.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
          { OR: [{ expires_at: null }, { expires_at: { gte: now } }] },
        ],
      },
      orderBy: [{ sort_order: 'asc' }, { promotion_id: 'asc' }],
    });
  }

  createPromotion(dto: CreatePromotionDto) {
    return this.prisma.promotions.create({ data: dto as never });
  }

  async updatePromotion(id: number, dto: UpdatePromotionDto) {
    await this.requirePromotion(id);
    return this.prisma.promotions.update({
      where: { promotion_id: id },
      data: dto as never,
    });
  }

  async deletePromotion(id: number) {
    const promotion = await this.requirePromotion(id);
    await this.prisma.promotions.delete({ where: { promotion_id: id } });
    await removeUploadedImage(promotion.image_url);
    return { ok: true };
  }

  async uploadPromotionImage(id: number, file: UploadedImage) {
    const promotion = await this.requirePromotion(id);
    const url = await uploadImageToBucket(file, `promo-${id}`);
    const updated = await this.prisma.promotions.update({
      where: { promotion_id: id },
      data: { image_url: url },
    });
    await removeUploadedImage(promotion.image_url);
    return updated;
  }

  private async requirePromotion(id: number) {
    const promotion = await this.prisma.promotions.findUnique({
      where: { promotion_id: id },
    });
    if (!promotion) throw new NotFoundException('Promotion not found');
    return promotion;
  }

  /* --------------------------- landing sections -------------------------- */

  listSections() {
    return this.prisma.landing_sections.findMany({
      orderBy: [{ position: 'asc' }, { section_id: 'asc' }],
    });
  }

  listActiveSections() {
    return this.prisma.landing_sections.findMany({
      where: { active: true },
      orderBy: [{ position: 'asc' }, { section_id: 'asc' }],
    });
  }

  async createSection(dto: UpsertSectionDto) {
    this.assertSectionType(dto.type);
    const last = await this.prisma.landing_sections.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return this.prisma.landing_sections.create({
      data: {
        ...dto,
        position: dto.position ?? (last ? last.position + 1 : 0),
      } as never,
    });
  }

  async updateSection(id: number, dto: UpsertSectionDto) {
    await this.requireSection(id);
    if (dto.type) this.assertSectionType(dto.type);
    return this.prisma.landing_sections.update({
      where: { section_id: id },
      data: dto as never,
    });
  }

  async deleteSection(id: number) {
    await this.requireSection(id);
    await this.prisma.landing_sections.delete({ where: { section_id: id } });
    return { ok: true };
  }

  async reorderSections(ids: number[]) {
    const rows = await this.prisma.landing_sections.findMany({
      select: { section_id: true },
    });
    const known = new Set(rows.map((row) => row.section_id));
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw new BadRequestException(
        'The ordered list must contain every section exactly once',
      );
    }
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.landing_sections.update({
          where: { section_id: id },
          data: { position: index },
        }),
      ),
    );
    return this.listSections();
  }

  private assertSectionType(type: string) {
    if (!SECTION_TYPES.includes(type as (typeof SECTION_TYPES)[number])) {
      throw new BadRequestException(
        `Unknown section type "${type}". Allowed: ${SECTION_TYPES.join(', ')}`,
      );
    }
  }

  private async requireSection(id: number) {
    const section = await this.prisma.landing_sections.findUnique({
      where: { section_id: id },
    });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  /* -------------------------------- helpers ------------------------------ */

  /** Appends -2, -3 ... until the slug is free. */
  private async uniqueSlug(
    table: 'brands' | 'collections',
    base: string,
  ): Promise<string> {
    const seed = base || 'item';
    let candidate = seed;
    let suffix = 2;

    for (;;) {
      const taken =
        table === 'brands'
          ? await this.prisma.brands.findUnique({ where: { slug: candidate } })
          : await this.prisma.collections.findUnique({
              where: { slug: candidate },
            });
      if (!taken) return candidate;
      candidate = `${seed}-${suffix}`;
      suffix += 1;
    }
  }
}
