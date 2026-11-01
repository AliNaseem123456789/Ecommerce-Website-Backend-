import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { supabase } from '../supabase/supabase.client';
import {
  CreateProductDto,
  UpdateOrderStatusDto,
  UpdateProductDto,
} from './dto/admin.dto';

const TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
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
        data: { status: dto.status, ...stamp },
      });
    });

    if (dto.status === 'shipped') {
      const email = order.shipping_address[0]?.email;
      if (email) {
        try {
          await this.mailService.send(
            email,
            `Order ${order.order_id} has shipped`,
            `<p>Your order ${order.order_id} is on the way.</p>`,
          );
        } catch (error) {
          console.error('Shipment email failed:', error);
        }
      }
    }
    return updated;
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

  private async requireProduct(id: number) {
    const product = await this.prisma.products.findUnique({
      where: { product_id: id },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
