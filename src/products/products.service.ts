import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { supabase } from '../supabase/supabase.client';
import { ListProductsDto } from './dto/list-products.dto';

@Injectable()
export class ProductsService {
  /** Two images are enough for a card: the primary plus the hover shot. */
  private static readonly CARD_IMAGES = {
    product_images: {
      take: 2,
      orderBy: [
        { is_primary: 'desc' as const },
        { sort_order: 'asc' as const },
        { id: 'asc' as const },
      ],
    },
  };

  /** Flattens product_images into a plain `images` array of URLs. */
  private static withImages<T extends { image_url?: string | null }>(
    row: T & { product_images?: { url: string }[] },
  ) {
    const gallery = (row.product_images || []).map((image) => image.url);
    const images = gallery.length
      ? gallery
      : row.image_url
        ? [row.image_url]
        : [];
    const { product_images, ...rest } = row;
    void product_images;
    return { ...rest, images };
  }

  constructor(private readonly prisma: PrismaService) {}

  async getFeatured(idsString: string) {
    if (!idsString) return [];

    const ids = idsString.split(',').map(Number);
    const rows = await this.prisma.products.findMany({
      where: { product_id: { in: ids } },
      include: ProductsService.CARD_IMAGES,
    });
    return rows.map((row) => ProductsService.withImages(row));
  }

  async findManyByIds(ids: number[]) {
    if (ids.length === 0) return [];

    const rows = await this.prisma.products.findMany({
      where: { product_id: { in: ids } },
      include: ProductsService.CARD_IMAGES,
    });
    return rows.map((row) => ProductsService.withImages(row));
  }

  async getProducts(query: ListProductsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 60);
    const where: Prisma.productsWhereInput = {};

    if (query.categories) {
      // Selecting a parent category must also return everything in its
      // subcategories, otherwise "Kitchen" looks empty once products move
      // down into "Cookware".
      const selected = query.categories
        .split(',')
        .map(Number)
        .filter((id) => !Number.isNaN(id));
      const children = await this.prisma.categories.findMany({
        where: { parent_id: { in: selected } },
        select: { category_id: true },
      });
      const expanded = Array.from(
        new Set([...selected, ...children.map((row) => row.category_id)]),
      );
      where.category_id = { in: expanded };
    }

    if (query.brand) {
      const asId = Number(query.brand);
      where.brand_id = Number.isNaN(asId)
        ? (
            await this.prisma.brands.findUnique({
              where: { slug: query.brand },
              select: { brand_id: true },
            })
          )?.brand_id ?? -1
        : asId;
    }

    if (query.collection) {
      const collection = await this.prisma.collections.findUnique({
        where: { slug: query.collection },
        select: { collection_id: true },
      });
      where.collection_products = collection
        ? { some: { collection_id: collection.collection_id } }
        : { some: { collection_id: -1 } };
    }
    if (query.minPrice != null || query.maxPrice != null) {
      where.price = {};
      if (query.minPrice != null) where.price.gte = query.minPrice;
      if (query.maxPrice != null) where.price.lte = query.maxPrice;
    }

    const sort = query.sort || query.sortBy;
    let orderBy: Prisma.productsOrderByWithRelationInput | undefined;
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'rating' || sort === 'rating_desc') orderBy = { avg_rating: 'desc' };
    if (sort === 'name_asc') orderBy = { name: 'asc' };
    if (sort === 'name_desc') orderBy = { name: 'desc' };

    const [total, items] = await Promise.all([
      this.prisma.products.count({ where }),
      this.prisma.products.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: ProductsService.CARD_IMAGES,
      }),
    ]);
    return {
      items: items.map((item) => ProductsService.withImages(item)),
      total,
      page,
      limit,
    };
  }

  async related(id: number, limit = 8) {
    const product = await this.prisma.products.findUnique({
      where: { product_id: id },
      select: { category_id: true },
    });
    if (!product?.category_id) return [];
    return this.prisma.products.findMany({
      where: {
        category_id: product.category_id,
        product_id: { not: id },
      },
      orderBy: { avg_rating: 'desc' },
      take: limit,
    });
  }

  /**
   * Curated-looking rows that need no curation: everything below is derived
   * from data the store already produces.
   */

  /** Ranked by units sold across every order that was not cancelled. */
  async bestSellers(limit = 8) {
    const liveOrders = await this.prisma.orders.findMany({
      where: { status: { not: 'cancelled' } },
      select: { order_id: true },
    });
    if (liveOrders.length === 0) return [];

    const grouped = await this.prisma.order_items.groupBy({
      by: ['product_id'],
      _sum: { quantity: true },
      where: { order_id: { in: liveOrders.map((row) => row.order_id) } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const ranked = grouped
      .map((row) => row.product_id)
      .filter((id): id is number => id !== null);
    if (ranked.length === 0) return [];

    const rows = await this.prisma.products.findMany({
      where: { product_id: { in: ranked } },
      include: ProductsService.CARD_IMAGES,
    });

    const sold = new Map(
      grouped.map((row) => [row.product_id, row._sum.quantity ?? 0]),
    );
    const position = new Map(ranked.map((id, index) => [id, index]));

    return rows
      .sort(
        (left, right) =>
          (position.get(left.product_id) ?? 0) -
          (position.get(right.product_id) ?? 0),
      )
      .map((row) => ({
        ...ProductsService.withImages(row),
        units_sold: sold.get(row.product_id) ?? 0,
      }));
  }

  /** Newest products first. */
  async newArrivals(limit = 8) {
    const rows = await this.prisma.products.findMany({
      orderBy: [{ created_at: 'desc' }, { product_id: 'desc' }],
      take: limit,
      include: ProductsService.CARD_IMAGES,
    });
    return rows.map((row) => ProductsService.withImages(row));
  }

  /** Highest rated, but only products that actually have reviews. */
  async topRated(limit = 8) {
    const rows = await this.prisma.products.findMany({
      where: { product_reviews: { some: {} } },
      orderBy: [{ avg_rating: 'desc' }, { created_at: 'desc' }],
      take: limit,
      include: {
        ...ProductsService.CARD_IMAGES,
        _count: { select: { product_reviews: true } },
      },
    });
    return rows.map((row) => {
      const mapped = ProductsService.withImages(row) as Record<string, unknown>;
      const counts = row as unknown as {
        _count?: { product_reviews: number };
      };
      mapped.review_count = counts._count?.product_reviews ?? 0;
      return mapped;
    });
  }

  /** Ranked by how many wishlists a product appears on. */
  async mostWishlisted(limit = 8) {
    const grouped = await this.prisma.wishlist_test.groupBy({
      by: ['product_id'],
      _count: { product_id: true },
      orderBy: { _count: { product_id: 'desc' } },
      take: limit,
    });

    const ranked = grouped
      .map((row) => row.product_id)
      .filter((id): id is number => id !== null && id !== undefined);
    if (ranked.length === 0) return [];

    const rows = await this.prisma.products.findMany({
      where: { product_id: { in: ranked } },
      include: ProductsService.CARD_IMAGES,
    });

    const position = new Map(ranked.map((id, index) => [id, index]));
    return rows
      .sort(
        (left, right) =>
          (position.get(left.product_id) ?? 0) -
          (position.get(right.product_id) ?? 0),
      )
      .map((row) => ProductsService.withImages(row));
  }

  async findOne(id: number) {
    const product = await this.prisma.products.findUnique({
      where: { product_id: id },
    });
    if (!product) {
      throw new Error(
        'JSON object requested, multiple (or no) rows returned',
      );
    }
    const review_count = await this.prisma.product_reviews.count({
      where: { product_id: id },
    });

    const gallery = await this.prisma.product_images.findMany({
      where: { product_id: id },
      orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }, { id: 'asc' }],
      select: { id: true, url: true, is_primary: true, sort_order: true },
    });

    // `images` is the ordered gallery, primary first. Falls back to the single
    // image_url so products with no gallery rows still render.
    const images = gallery.length
      ? gallery.map((row) => row.url)
      : product.image_url
        ? [product.image_url]
        : [];

    return { ...product, review_count, images, gallery };
  }

  async searchProducts(searchParams: any) {
    const { q, category, minPrice, maxPrice, sortBy } = searchParams;
    const where: Prisma.productsWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (category) where.category_id = Number(category);
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    let orderBy: Prisma.productsOrderByWithRelationInput = {
      created_at: 'desc',
    };
    switch (sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'rating_desc':
        orderBy = { avg_rating: 'desc' };
        break;
    }

    return this.prisma.products.findMany({ where, orderBy });
  }

  async getSuggestions(searchTerm: string) {
    console.log('getSuggestions called with:', searchTerm);

    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    let rows;
    try {
      rows = await this.prisma.products.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: { product_id: true, name: true, price: true },
        take: 5,
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }

    return rows.map((product) => {
      let image_url: string | null = null;
      try {
        const { data: imageData } = supabase.storage
          .from('products')
          .getPublicUrl(`${product.product_id}-1.jpeg`);
        image_url = imageData.publicUrl;
      } catch (err) {
        console.log(`No image found for product ${product.product_id}`);
      }

      return {
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        image_url,
      };
    });
  }
}
