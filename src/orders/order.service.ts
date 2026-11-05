import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PaymentsService } from '../payments/payments.service';
import { embedOrder } from '../common/interceptors/serialize.interceptor';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  private returnWindowDays() {
    return Number(this.config.get('RETURN_WINDOW_DAYS') ?? 30);
  }

  private async ownedOrder(userId: string, orderId: string) {
    let order;
    try {
      order = await this.prisma.orders.findUnique({
        where: { order_id: orderId },
        include: { order_items: true, order_requests: true },
      });
    } catch {
      throw new BadRequestException('Invalid order id');
    }
    // Same answer for "missing" and "someone else's".
    if (!order || order.user_id !== userId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private openRequest(order: any, type: string) {
    return order.order_requests?.find(
      (r: any) => r.type === type && r.status === 'open',
    );
  }

  /** What the customer can do with an order right now (used by the UI and chatbot). */
  async eligibility(userId: string, orderId: string) {
    const order = await this.ownedOrder(userId, orderId);
    return this.describeEligibility(order);
  }

  private describeEligibility(order: any) {
    const status = order.status || 'pending';
    const windowDays = this.returnWindowDays();
    const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null;
    const returnDeadline = deliveredAt
      ? new Date(deliveredAt.getTime() + windowDays * 86_400_000)
      : null;
    const cancel =
      status === 'pending' && order.payment_status !== 'paid'
        ? { allowed: true, mode: 'immediate' }
        : status === 'paid'
          ? { allowed: true, mode: 'request' }
          : { allowed: false, reason: `Orders that are ${status} can't be cancelled` };
    const ret =
      status === 'delivered' && returnDeadline && returnDeadline > new Date()
        ? { allowed: true, deadline: returnDeadline.toISOString() }
        : {
            allowed: false,
            reason:
              status !== 'delivered'
                ? 'Returns open once the order is delivered'
                : `The ${windowDays}-day return window has closed`,
          };
    return {
      order_id: order.order_id,
      status,
      payment_status: order.payment_status,
      cancel: this.openRequest(order, 'cancel')
        ? { allowed: false, reason: 'A cancellation request is already open' }
        : cancel,
      return: this.openRequest(order, 'return')
        ? { allowed: false, reason: 'A return request is already open' }
        : ret,
      open_requests: (order.order_requests || []).filter((r: any) => r.status === 'open'),
    };
  }

  async cancel(userId: string, orderId: string, reason?: string) {
    const order = await this.ownedOrder(userId, orderId);
    const rules = this.describeEligibility(order);
    if (!rules.cancel.allowed) {
      throw new ConflictException((rules.cancel as any).reason);
    }

    if ((rules.cancel as any).mode === 'immediate') {
      // Unpaid: void the payment intent first so it can't be paid afterwards.
      if (order.payment_intent_id) {
        const voided = await this.payments.cancelPaymentIntent(order.payment_intent_id);
        if (!voided) {
          throw new ConflictException(
            'Payment is already being processed, so this order needs a cancellation request instead',
          );
        }
      }
      const updated = await this.prisma.orders.updateMany({
        where: { order_id: orderId, user_id: userId, status: 'pending' },
        data: { status: 'cancelled', cancelled_at: new Date() },
      });
      if (updated.count !== 1) throw new ConflictException('Order changed, please retry');
      return { result: 'cancelled', order_id: orderId };
    }

    const request = await this.prisma.order_requests.create({
      data: { order_id: orderId, user_id: userId, type: 'cancel', reason: reason ?? null },
    });
    return { result: 'requested', order_id: orderId, request_id: request.id };
  }

  async requestReturn(userId: string, orderId: string, reason: string, itemIds?: number[]) {
    const order = await this.ownedOrder(userId, orderId);
    const rules = this.describeEligibility(order);
    if (!rules.return.allowed) {
      throw new ConflictException((rules.return as any).reason);
    }
    const valid = new Set(order.order_items.map((i: any) => Number(i.item_id)));
    const ids = (itemIds ?? []).map(Number);
    if (ids.some((id) => !valid.has(id))) {
      throw new BadRequestException('One or more items are not part of this order');
    }
    const request = await this.prisma.order_requests.create({
      data: {
        order_id: orderId,
        user_id: userId,
        type: 'return',
        reason,
        item_ids: ids.map((id) => BigInt(id)),
      },
    });
    return {
      result: 'requested',
      order_id: orderId,
      request_id: request.id,
      deadline: (rules.return as any).deadline,
    };
  }

  listRequests(status?: string) {
    return this.prisma.order_requests.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async resolveRequest(id: string, status: string, note?: string) {
    const existing = await this.prisma.order_requests.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Request not found');
    return this.prisma.order_requests.update({
      where: { id },
      data: { status, admin_note: note ?? null, resolved_at: new Date() },
    });
  }

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
              item_id: true,
              product_id: true,
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
