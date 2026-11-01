import { Injectable } from '@nestjs/common';
import { embedOrder } from '../common/interceptors/serialize.interceptor';
import { PrismaService } from '../prisma/prisma.service';

function supabaseResult(
  data: unknown,
  status = 200,
  statusText = 'OK',
) {
  return { error: null, data, count: null, status, statusText };
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const rows = await this.prisma.cart_items_test.findMany({
      where: { user_id: userId },
      orderBy: { cart_item_id: 'asc' },
      select: {
        cart_item_id: true,
        quantity: true,
        products: true,
      },
    });
    return rows.map((row) => ({
      ...row,
      products: row.products ? embedOrder(row.products) : row.products,
    }));
  }

  async addItem(userId: string, productId: string | number, quantity: number) {
    const product_id = Number(productId);
    const existing = await this.prisma.cart_items_test.findFirst({
      where: { user_id: userId, product_id },
    });

    if (existing) {
      const updated = await this.prisma.cart_items_test.update({
        where: { cart_item_id: existing.cart_item_id },
        data: { quantity: (existing.quantity ?? 0) + quantity },
      });
      return supabaseResult(updated, 200, 'OK');
    }

    const created = await this.prisma.cart_items_test.create({
      data: { user_id: userId, product_id, quantity },
      select: {
        cart_item_id: true,
        quantity: true,
        products: true,
      },
    });
    return supabaseResult(
      { ...created, products: created.products ? embedOrder(created.products) : created.products },
      201,
      'Created',
    );
  }

  async updateQty(cartItemId: string, quantity: number) {
    await this.prisma.cart_items_test.update({
      where: { cart_item_id: BigInt(cartItemId) },
      data: { quantity },
    });
    return supabaseResult(null, 204, 'No Content');
  }

  async removeItem(cartItemId: string) {
    await this.prisma.cart_items_test.delete({
      where: { cart_item_id: BigInt(cartItemId) },
    });
    return supabaseResult(null, 204, 'No Content');
  }

  async mergeCarts(guestId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const guestItems = await tx.cart_items_test.findMany({
        where: { user_id: guestId },
      });
      if (guestItems.length === 0) return;

      for (const item of guestItems) {
        const existing = await tx.cart_items_test.findFirst({
          where: { user_id: userId, product_id: item.product_id },
        });
        if (existing) {
          await tx.cart_items_test.update({
            where: { cart_item_id: existing.cart_item_id },
            data: {
              quantity: (existing.quantity ?? 0) + (item.quantity ?? 0),
            },
          });
        } else {
          await tx.cart_items_test.create({
            data: {
              user_id: userId,
              product_id: item.product_id,
              quantity: item.quantity,
            },
          });
        }
      }

      await tx.cart_items_test.deleteMany({ where: { user_id: guestId } });
      return { success: true };
    });
  }

  async clearCart(userId: string) {
    try {
      const deleted = await this.prisma.cart_items_test.deleteMany({
        where: { user_id: userId },
      });
      return {
        success: true,
        message: 'Cart cleared successfully',
        deletedCount: deleted.count,
      };
    } catch (error) {
      throw new Error(`Failed to clear cart: ${error.message}`);
    }
  }
}
