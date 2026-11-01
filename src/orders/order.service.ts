import { Injectable, BadRequestException } from '@nestjs/common';
import { embedOrder } from '../common/interceptors/serialize.interceptor';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserOrders(userId: string) {
    try {
      const orders = await this.prisma.orders.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        select: {
          order_id: true,
          total: true,
          created_at: true,
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

  async createOrder(userId: string, orderData: any) {
    const { subtotal, shipping, total, form, items } = orderData;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.orders.create({
        data: { user_id: userId, subtotal, shipping, total },
      });

      await tx.shipping_address.create({
        data: { order_id: order.order_id, ...form },
      });

      await tx.order_items.createMany({
        data: items.map((item) => ({
          order_id: order.order_id,
          product_id: item.products.product_id,
          quantity: item.quantity,
          price: item.products.price,
        })),
      });

      return order;
    });
  }
}
