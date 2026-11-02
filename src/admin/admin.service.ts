import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { QuestionService } from '../question/question.service';
import { ReviewService } from '../review/review.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateCouponDto, UpdateCouponDto } from '../coupons/dto/coupon.dto';
import { supabase } from '../supabase/supabase.client';
import {
  CreateProductDto,
  UpdateOrderStatusDto,
  UpdateOrderTrackingDto,
  UpdateProductDto,
} from './dto/admin.dto';

const TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY_UPLOAD = 6;

/** Public URL -> object name inside the `products` bucket. */
function storageObjectName(url: string): string | null {
  if (!url) return null;
  const marker = '/products/';
  const index = url.lastIndexOf(marker);
  if (index === -1) return null;
  const name = url.slice(index + marker.length).split('?')[0];
  return name ? decodeURIComponent(name) : null;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly questionService: QuestionService,
    private readonly reviewService: ReviewService,
    private readonly couponsService: CouponsService,
  ) {}

  summary() {
    return this.prisma.$transaction(async (tx) => {
      const [products, customers, orders, grouped] = await Promise.all([
        tx.products.count(),
        tx.users_test.count(),
        tx.orders.count(),
        tx.orders.groupBy({ by: ['status'], _count: { order_id: true } }),
      ]);
      return {
        products,
        customers,
        orders,
        byStatus: grouped.map((row) => ({
          status: row.status,
          count: row._count.order_id,
        })),
      };
    });
  }

  listProducts() {
    return this.prisma.products.findMany({ orderBy: { product_id: 'asc' } });
  }

  async createProduct(dto: CreateProductDto) {
    const data = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock ?? 0,
      category_id: dto.category_id,
      brand_id: dto.brand_id,
    };
    try {
      return await this.prisma.products.create({ data });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
      await this.prisma.$executeRaw`
        SELECT setval(
          pg_get_serial_sequence('products', 'product_id'),
          (SELECT MAX(product_id) FROM products)
        )
      `;
      return this.prisma.products.create({ data });
    }
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    await this.requireProduct(id);
    return this.prisma.products.update({
      where: { product_id: id },
      data: dto,
    });
  }

  async deleteProduct(id: number) {
    await this.requireProduct(id);
    try {
      await this.prisma.products.delete({ where: { product_id: id } });
    } catch {
      throw new ConflictException('This product is used by an order and cannot be deleted');
    }
    return { ok: true };
  }

  async uploadImage(id: number, dataUrl: string) {
    await this.requireProduct(id);
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    const body = Buffer.from(match ? match[2] : dataUrl, 'base64');
    const type = match?.[1] || 'image/jpeg';
    const ext = type.includes('png') ? 'png' : 'jpeg';
    const file = `${id}-1.${ext}`;
    const { error } = await supabase.storage.from('products').upload(file, body, {
      upsert: true,
      contentType: type,
    });
    if (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
    const { data } = supabase.storage.from('products').getPublicUrl(file);
    return this.prisma.products.update({
      where: { product_id: id },
      data: { image_url: data.publicUrl },
    });
  }

  getProduct(id: number) {
    return this.requireProduct(id);
  }

  async getOrder(id: string) {
    const order = await this.prisma.orders.findUnique({
      where: { order_id: id },
      include: {
        order_items: {
          include: { products: { select: { name: true, product_id: true } } },
        },
        shipping_address: true,
        users_test: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  listOrders(status?: string) {
    return this.prisma.orders.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
      include: {
        order_items: true,
        shipping_address: true,
        users_test: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.orders.findUnique({
      where: { order_id: orderId },
      include: { order_items: true, shipping_address: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const current = order.status || 'pending';
    const allowed = TRANSITIONS[current] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot change ${current} to ${dto.status}`,
      );
    }

    const stamp =
      dto.status === 'paid'
        ? { paid_at: new Date(), payment_status: 'paid' }
        : dto.status === 'shipped'
          ? { shipped_at: new Date() }
          : dto.status === 'delivered'
            ? { delivered_at: new Date() }
            : { cancelled_at: new Date() };

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === 'cancelled' && current === 'paid') {
        for (const item of order.order_items) {
          if (item.product_id == null || item.quantity == null) continue;
          await tx.products.update({
            where: { product_id: item.product_id },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return tx.orders.update({
        where: { order_id: orderId },
        data: {
          status: dto.status,
          ...stamp,
          ...(dto.tracking_number !== undefined
            ? { tracking_number: dto.tracking_number }
            : {}),
          ...(dto.carrier !== undefined ? { carrier: dto.carrier } : {}),
        },
      });
    });

    if (dto.status === 'shipped') {
      const email = order.shipping_address[0]?.email;
      if (email) {
        try {
          await this.mailService.send(
            email,
            `Order ${order.order_id} has shipped`,
            `<p>Your order ${order.order_id} is on the way.</p><p>Carrier: ${dto.carrier || order.carrier || 'not set'}<br/>Tracking: ${dto.tracking_number || order.tracking_number || 'not set'}</p>`,
          );
        } catch (error) {
          console.error('Shipment email failed:', error);
        }
      }
    }
    return updated;
  }

  async updateTracking(orderId: string, dto: UpdateOrderTrackingDto) {
    const order = await this.prisma.orders.findUnique({
      where: { order_id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.orders.update({
      where: { order_id: orderId },
      data: {
        tracking_number: dto.tracking_number ?? null,
        carrier: dto.carrier ?? null,
      },
    });
  }

  listReviews() {
    return this.prisma.product_reviews.findMany({
      orderBy: { created_at: 'desc' },
      include: { products: { select: { name: true, product_id: true } } },
    });
  }

  deleteReview(id: number) {
    return this.reviewService.deleteByAdmin(id);
  }

  listQuestions() {
    return this.questionService.listForAdmin();
  }

  answerQuestion(id: number, answer: string, adminId?: string) {
    return this.questionService.answer(id, answer, adminId);
  }

  listCoupons() {
    return this.couponsService.list();
  }

  createCoupon(dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  updateCoupon(id: string, dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  deleteCoupon(id: string) {
    return this.couponsService.remove(id);
  }

  listCustomers() {
    return this.prisma.users_test.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });
  }

  // ---------------------------------------------------------------
  // Product image gallery
  // ---------------------------------------------------------------

  async listImages(productId: number) {
    await this.requireProduct(productId);
    return this.prisma.product_images.findMany({
      where: { product_id: productId },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
  }

  async uploadImages(productId: number, files: UploadedImage[]) {
    await this.requireProduct(productId);
    if (!files?.length) {
      throw new BadRequestException('No files were received');
    }
    if (files.length > MAX_GALLERY_UPLOAD) {
      throw new BadRequestException(
        `Upload at most ${MAX_GALLERY_UPLOAD} images at a time`,
      );
    }

    const existing = await this.prisma.product_images.count({
      where: { product_id: productId },
    });
    let nextOrder = existing;
    const created: unknown[] = [];

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `${file.originalname}: only JPEG, PNG, WebP and AVIF are allowed`,
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException(`${file.originalname}: larger than 5 MB`);
      }

      // Unique object name per upload, so the CDN never serves a stale file.
      const ext = EXTENSION_BY_TYPE[file.mimetype] || 'jpeg';
      const objectName = `${productId}-${randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('products')
        .upload(objectName, file.buffer, {
          upsert: false,
          contentType: file.mimetype,
        });
      if (error) {
        throw new BadRequestException(
          `${file.originalname}: upload failed (${error.message})`,
        );
      }

      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(objectName);

      created.push(
        await this.prisma.product_images.create({
          data: {
            product_id: productId,
            url: data.publicUrl,
            sort_order: nextOrder,
            is_primary: existing === 0 && nextOrder === 0,
          },
        }),
      );
      nextOrder += 1;
    }

    await this.syncPrimaryImage(productId);
    return this.listImages(productId);
  }

  async deleteImage(productId: number, imageId: number) {
    await this.requireProduct(productId);
    const image = await this.prisma.product_images.findFirst({
      where: { id: imageId, product_id: productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    await this.prisma.product_images.delete({ where: { id: imageId } });

    const objectName = storageObjectName(image.url);
    if (objectName) {
      await supabase.storage.from('products').remove([objectName]);
    }

    await this.resequenceImages(productId);
    await this.syncPrimaryImage(productId);
    return this.listImages(productId);
  }

  async reorderImages(productId: number, ids: number[]) {
    await this.requireProduct(productId);
    const owned = await this.prisma.product_images.findMany({
      where: { product_id: productId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((row) => row.id));
    if (ids.length !== ownedIds.size || ids.some((id) => !ownedIds.has(id))) {
      throw new BadRequestException(
        'The ordered list must contain every image of this product exactly once',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.product_images.update({
          where: { id },
          data: { sort_order: index },
        }),
      ),
    );
    await this.syncPrimaryImage(productId);
    return this.listImages(productId);
  }

  async setPrimaryImage(productId: number, imageId: number) {
    await this.requireProduct(productId);
    const image = await this.prisma.product_images.findFirst({
      where: { id: imageId, product_id: productId },
    });
    if (!image) throw new NotFoundException('Image not found');

    await this.prisma.$transaction([
      this.prisma.product_images.updateMany({
        where: { product_id: productId },
        data: { is_primary: false },
      }),
      this.prisma.product_images.update({
        where: { id: imageId },
        data: { is_primary: true },
      }),
      this.prisma.products.update({
        where: { product_id: productId },
        data: { image_url: image.url },
      }),
    ]);
    return this.listImages(productId);
  }

  /** Close gaps in sort_order after a delete. */
  private async resequenceImages(productId: number) {
    const rows = await this.prisma.product_images.findMany({
      where: { product_id: productId },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    await this.prisma.$transaction(
      rows.map((row, index) =>
        this.prisma.product_images.update({
          where: { id: row.id },
          data: { sort_order: index },
        }),
      ),
    );
  }

  /**
   * Guarantees exactly one primary image and keeps products.image_url in step,
   * so the storefront, cart, wishlist and compare keep working unchanged.
   */
  private async syncPrimaryImage(productId: number) {
    const rows = await this.prisma.product_images.findMany({
      where: { product_id: productId },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });

    if (rows.length === 0) {
      await this.prisma.products.update({
        where: { product_id: productId },
        data: { image_url: null },
      });
      return;
    }

    const primary = rows.find((row) => row.is_primary) || rows[0];
    await this.prisma.$transaction([
      this.prisma.product_images.updateMany({
        where: { product_id: productId, id: { not: primary.id } },
        data: { is_primary: false },
      }),
      this.prisma.product_images.update({
        where: { id: primary.id },
        data: { is_primary: true },
      }),
      this.prisma.products.update({
        where: { product_id: productId },
        data: { image_url: primary.url },
      }),
    ]);
  }

  // ---------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------

  listCategories() {
    return this.prisma.categories.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
        parent: { select: { category_id: true, name: true } },
      },
    });
  }

  createCategory(dto: { name: string }) {
    return this.prisma.categories.create({ data: { name: dto.name } });
  }

  async updateCategory(
    id: number,
    dto: {
      name?: string;
      featured?: boolean;
      sort_order?: number;
      parent_id?: number | null;
    },
  ) {
    await this.requireCategory(id);
    if (dto.parent_id != null) {
      if (dto.parent_id === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      const parent = await this.prisma.categories.findUnique({
        where: { category_id: dto.parent_id },
        select: { parent_id: true },
      });
      if (!parent) throw new BadRequestException('That parent category does not exist');
      if (parent.parent_id != null) {
        throw new BadRequestException(
          'Only one level of subcategory is supported',
        );
      }
    }
    return this.prisma.categories.update({
      where: { category_id: id },
      data: dto,
    });
  }

  async uploadCategoryImage(id: number, file: UploadedImage) {
    await this.requireCategory(id);
    if (!file) throw new BadRequestException('No file was received');
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP and AVIF images are allowed',
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Images must be 5 MB or smaller');
    }

    const ext = EXTENSION_BY_TYPE[file.mimetype] || 'jpeg';
    const objectName = `category-${id}-${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('products')
      .upload(objectName, file.buffer, {
        upsert: false,
        contentType: file.mimetype,
      });
    if (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from('products').getPublicUrl(objectName);
    const previous = await this.prisma.categories.findUnique({
      where: { category_id: id },
      select: { image_url: true },
    });

    const updated = await this.prisma.categories.update({
      where: { category_id: id },
      data: { image_url: data.publicUrl },
    });

    const oldObject = storageObjectName(previous?.image_url || '');
    if (oldObject && oldObject.startsWith(`category-${id}-`)) {
      await supabase.storage.from('products').remove([oldObject]);
    }

    return updated;
  }

  private async requireCategory(id: number) {
    const category = await this.prisma.categories.findUnique({
      where: { category_id: id },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async requireProduct(id: number) {
    const product = await this.prisma.products.findUnique({
      where: { product_id: id },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
