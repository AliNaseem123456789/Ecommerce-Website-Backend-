import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { roundMoney } from '../payments/pricing';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string, userId?: string) {
    const cart = userId
      ? await this.prisma.cart_items_test.findMany({
          where: { user_id: userId },
          include: { products: true },
        })
      : [];
    const subtotal = cart.reduce(
      (sum, line) =>
        sum + Number(line.products?.price?.toString() || 0) * (line.quantity || 0),
      0,
    );
    const result = await this.quote(code, userId, subtotal);
    if (!result.ok) {
      return { valid: false, discount: 0, message: result.message };
    }
    return {
      valid: true,
      discount: result.discount,
      message: result.message,
    };
  }

  async quote(code: string | undefined, userId: string | undefined, subtotal: number) {
    if (!code) return { ok: true as const, coupon: null, discount: 0, message: '' };
    const coupon = await this.prisma.coupons.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    const reason = await this.rejection(coupon, userId, subtotal);
    if (reason || !coupon) {
      return { ok: false as const, coupon: null, discount: 0, message: reason || 'Unknown code' };
    }
    return {
      ok: true as const,
      coupon,
      discount: this.discountFor(coupon, subtotal),
      message: 'Coupon applied',
    };
  }

  async list() {
    const rows = await this.prisma.coupons.findMany({
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { coupon_redemptions: true } } },
    });
    return rows.map((row) => ({
      ...row,
      redemption_count: row._count.coupon_redemptions,
    }));
  }

  create(dto: CreateCouponDto) {
    return this.prisma.coupons.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        type: dto.type,
        value: dto.value,
        min_order: dto.min_order ?? null,
        usage_limit: dto.usage_limit ?? null,
        per_user_limit: dto.per_user_limit ?? null,
        starts_at: dto.starts_at ? new Date(dto.starts_at) : null,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.require(id);
    return this.prisma.coupons.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.trim().toUpperCase() : undefined,
        starts_at: dto.starts_at ? new Date(dto.starts_at) : undefined,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
      },
    });
  }

  async remove(id: string) {
    const used = await this.prisma.coupon_redemptions.count({
      where: { coupon_id: id },
    });
    if (used > 0) {
      throw new ConflictException(
        'This coupon has redemptions. Deactivate it instead of deleting it.',
      );
    }
    await this.require(id);
    await this.prisma.coupons.delete({ where: { id } });
    return { deleted: true };
  }

  private async require(id: string) {
    const row = await this.prisma.coupons.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Coupon not found');
    return row;
  }

  private discountFor(
    coupon: { type: string; value: { toString(): string } },
    subtotal: number,
  ) {
    const value = Number(coupon.value.toString());
    const raw = coupon.type === 'percent' ? (subtotal * value) / 100 : value;
    return roundMoney(Math.min(Math.max(raw, 0), subtotal));
  }

  private async rejection(coupon, userId: string | undefined, subtotal: number) {
    if (!coupon) return 'Unknown code';
    if (coupon.active === false) return 'This code is not active';
    const now = Date.now();
    if (coupon.starts_at && coupon.starts_at.getTime() > now) {
      return 'This code is not active yet';
    }
    if (coupon.expires_at && coupon.expires_at.getTime() < now) {
      return 'This code has expired';
    }
    if (coupon.min_order != null && subtotal < Number(coupon.min_order.toString())) {
      return 'Order total is below the minimum for this code';
    }
    const used = await this.prisma.coupon_redemptions.count({
      where: { coupon_id: coupon.id },
    });
    if (coupon.usage_limit != null && used >= coupon.usage_limit) {
      return 'This code has reached its usage limit';
    }
    if (userId && coupon.per_user_limit != null) {
      const mine = await this.prisma.coupon_redemptions.count({
        where: { coupon_id: coupon.id, user_id: userId },
      });
      if (mine >= coupon.per_user_limit) {
        return 'You have already used this code';
      }
    }
    if (!userId) return 'Sign in so we can check this code against your cart';
    return '';
  }
}
