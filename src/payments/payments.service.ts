import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { priceOrder, roundMoney } from './pricing';
import { MailService } from '../mail/mail.service';
import { CouponsService } from '../coupons/coupons.service';

type AddressFields = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  apartment?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
};

type StripeClient = Stripe.Stripe;
type PaidIntent = {
  metadata?: Record<string, string> | null;
  payment_method_types?: string[] | null;
  payment_method?: string | null;
};

@Injectable()
export class PaymentsService {
  private stripe: StripeClient;

  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly couponsService: CouponsService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined in environment variables',
      );
    }
    this.stripe = new Stripe(stripeKey);
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    const cart = await this.prisma.cart_items_test.findMany({
      where: { user_id: dto.userId },
      include: { products: true },
      orderBy: { cart_item_id: 'asc' },
    });

    if (cart.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const missing = cart.filter((line) => !line.products || !line.quantity);
    if (missing.length > 0) {
      throw new BadRequestException('Cart contains a line without a product');
    }

    const short = cart.filter(
      (line) => (line.products?.stock ?? 0) < (line.quantity ?? 0),
    );
    if (short.length > 0) {
      throw new ConflictException({
        message: 'Not enough stock',
        products: short.map((line) => line.products?.name).filter(Boolean),
      });
    }

    const subtotal = cart.reduce(
      (sum, line) =>
        sum +
        Number(line.products!.price.toString()) * (line.quantity as number),
      0,
    );
    const quoted = await this.couponsService.quote(
      dto.couponCode,
      dto.userId,
      subtotal,
    );
    if (!quoted.ok) {
      throw new BadRequestException(quoted.message);
    }
    const shippingChoice = await this.resolveShipping(
      dto.shippingCode,
      subtotal,
    );
    const totals = priceOrder(subtotal, quoted.discount, shippingChoice.price);
    const address = await this.resolveAddress(dto);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        dto.userId,
      );
    const account = isUuid
      ? await this.prisma.users_test.findUnique({
          where: { id: dto.userId },
          select: { id: true },
        })
      : null;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orders.create({
        data: {
          user_id: account ? dto.userId : null,
          status: 'pending',
          payment_status: 'unpaid',
          subtotal: totals.subtotal,
          shipping: totals.shipping,
          tax: totals.tax,
          total: totals.total,
          coupon_code: quoted.coupon?.code ?? null,
          discount: totals.discount,
          shipping_option: shippingChoice.code,
        },
      });
      if (quoted.coupon) {
        await tx.coupon_redemptions.create({
          data: {
            coupon_id: quoted.coupon.id,
            order_id: created.order_id,
            user_id: account ? dto.userId : null,
            amount_discounted: totals.discount,
          },
        });
      }
      await tx.shipping_address.create({
        data: { order_id: created.order_id, ...address },
      });
      await tx.order_items.createMany({
        data: cart.map((line) => ({
          order_id: created.order_id,
          product_id: line.product_id,
          quantity: line.quantity,
          price: line.products!.price,
          product_name: line.products!.name,
        })),
      });
      return created;
    });

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(totals.total * 100),
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          order_id: order.order_id,
          cart_user_id: dto.userId,
        },
      });
      await this.prisma.orders.update({
        where: { order_id: order.order_id },
        data: { payment_intent_id: paymentIntent.id },
      });
      return {
        clientSecret: paymentIntent.client_secret,
        orderId: order.order_id,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
        total: totals.total,
      };
    } catch (error) {
      await this.prisma.orders.delete({ where: { order_id: order.order_id } });
      throw new BadRequestException(
        `Failed to create payment intent: ${(error as Error).message}`,
      );
    }
  }

  /** Voids an unpaid intent. Returns false if Stripe says it can no longer be cancelled. */
  async cancelPaymentIntent(id: string): Promise<boolean> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(id);
      if (intent.status === 'canceled') return true;
      if (intent.status === 'succeeded' || intent.status === 'processing') {
        return false;
      }
      await this.stripe.paymentIntents.cancel(id);
      return true;
    } catch (error) {
      console.error('Stripe cancel failed:', (error as Error).message);
      return false;
    }
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
    }

    let event: ReturnType<StripeClient['webhooks']['constructEvent']>;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      throw new BadRequestException(
        `Invalid Stripe signature: ${(error as Error).message}`,
      );
    }

    if (event.type === 'payment_intent.succeeded') {
      const paid = await this.markPaid(event.data.object as PaidIntent);
      if (paid?.email) {
        try {
          await this.mailService.sendOrderReceipt(paid.email, paid.order);
        } catch (error) {
          console.error('Order receipt email failed:', error);
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.markFailed(event.data.object as PaidIntent);
    }

    return { received: true };
  }

  private async resolveShipping(code: string | undefined, subtotal: number) {
    const wanted = (code || 'standard').trim().toLowerCase();
    const option = await this.prisma.shipping_options.findUnique({
      where: { code: wanted },
    });
    if (!option || option.active === false) {
      throw new BadRequestException('Choose a shipping option');
    }
    const threshold =
      option.free_over == null ? null : Number(option.free_over.toString());
    const price =
      threshold != null && subtotal >= threshold
        ? 0
        : Number(option.price.toString());
    return { code: option.code, price: roundMoney(price) };
  }

  private async resolveAddress(
    dto: CreatePaymentIntentDto,
  ): Promise<AddressFields> {
    if (dto.addressId) {
      const saved = await this.prisma.user_addresses.findFirst({
        where: { id: dto.addressId, user_id: dto.userId },
      });
      if (!saved) {
        throw new BadRequestException('Address not found for this user');
      }
      return {
        first_name: saved.first_name,
        last_name: saved.last_name,
        email: saved.email,
        phone: saved.phone,
        street: saved.street,
        apartment: saved.apartment,
        city: saved.city,
        state: saved.state,
        postal_code: saved.postal_code,
      };
    }

    if (dto.address?.street) {
      return dto.address;
    }

    throw new BadRequestException('addressId or address is required');
  }

  private async markPaid(intent: PaidIntent) {
    const orderId = intent.metadata?.order_id;
    const cartUserId = intent.metadata?.cart_user_id;
    if (!orderId) return null;

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT order_id FROM orders
        WHERE order_id = CAST(${orderId} AS uuid)
        FOR UPDATE
      `;
      const order = await tx.orders.findUnique({
        where: { order_id: orderId },
        include: {
          order_items: true,
          shipping_address: true,
        },
      });
      if (!order || order.status === 'paid' || order.payment_status === 'paid') {
        return null;
      }
      if (order.status === 'cancelled') {
        // Cancelled before payment landed: leave it for staff to refund.
        console.error(`Payment succeeded for cancelled order ${orderId}`);
        return null;
      }

      for (const item of order.order_items) {
        if (item.product_id == null || item.quantity == null) continue;
        const updated = await tx.products.updateMany({
          where: {
            product_id: item.product_id,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) {
          throw new ConflictException(
            `Insufficient stock for product ${item.product_id}`,
          );
        }
      }

      await tx.orders.update({
        where: { order_id: orderId },
        data: {
          status: 'paid',
          payment_status: 'paid',
          paid_at: new Date(),
          payment_method:
            intent.payment_method_types?.[0] ??
            (typeof intent.payment_method === 'string'
              ? intent.payment_method
              : 'card'),
        },
      });

      if (cartUserId) {
        await tx.cart_items_test.deleteMany({ where: { user_id: cartUserId } });
      }

      return {
        email: order.shipping_address[0]?.email || null,
        order,
      };
    });
  }

  private async markFailed(intent: PaidIntent) {
    const orderId = intent.metadata?.order_id;
    if (!orderId) return;

    const order = await this.prisma.orders.findUnique({
      where: { order_id: orderId },
    });
    if (!order || order.payment_status === 'paid' || order.status === 'paid') {
      return;
    }

    await this.prisma.orders.update({
      where: { order_id: orderId },
      data: { payment_status: 'failed' },
    });
  }
}
