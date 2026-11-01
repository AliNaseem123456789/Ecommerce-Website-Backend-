import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { embedOrder } from '../common/interceptors/serialize.interceptor';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async getUserOrders(userId: string) {
    try {
      const orders = await this.prisma.orders.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        select: {
          order_id: true,
          total: true,
          status: true,
          payment_status: true,
          paid_at: true,
          shipped_at: true,
          delivered_at: true,
          cancelled_at: true,
          created_at: true,
          tracking_number: true,
          carrier: true,
          order_items: {
            orderBy: { item_id: 'asc' },
            select: {
              quantity: true,
              price: true,
              products: { select: { name: true } },
            },
          },
          shipping_address: true,
        },
      });
      return orders.map((order) => ({
        ...order,
        order_items: order.order_items.map((item) =>
          embedOrder({
            ...item,
            products: item.products ? embedOrder(item.products) : item.products,
          }),
        ),
        shipping_address: order.shipping_address.map((address) =>
          embedOrder(address),
        ),
      }));
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async track(orderId: string, email: string) {
    let order;
    try {
      order = await this.prisma.orders.findUnique({
        where: { order_id: orderId },
        include: { shipping_address: true, order_items: true },
      });
    } catch {
      throw new BadRequestException('Invalid order id');
    }
    const matches = order?.shipping_address.some(
      (address) => address.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!order || !matches) {
      throw new NotFoundException('No order matches that number and email');
    }
    return {
      order_id: order.order_id,
      status: order.status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      paid_at: order.paid_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
      tracking_number: order.tracking_number,
      carrier: order.carrier,
    };
  }

  async getOrder(orderId: string, authorization?: string) {
    let order;
    try {
      order = await this.prisma.orders.findUnique({
        where: { order_id: orderId },
        include: {
          order_items: {
            orderBy: { item_id: 'asc' },
            include: { products: { select: { name: true } } },
          },
          shipping_address: true,
        },
      });
    } catch {
      throw new BadRequestException('Invalid order id');
    }
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.user_id && order.user_id !== this.requesterId(authorization)) {
      throw new ForbiddenException('This order belongs to another account');
    }
    return order;
  }

  private requesterId(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    try {
      const payload = this.jwtService.verify<{ sub?: string }>(token);
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
