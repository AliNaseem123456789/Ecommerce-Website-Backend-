import { Injectable } from '@nestjs/common';
import { embedOrder } from '../common/interceptors/serialize.interceptor';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const rows = await this.prisma.wishlist_test.findMany({
      where: { user_id: userId },
      select: { product_id: true },
      orderBy: { wishlist_item_id: 'asc' },
    });
    return rows.map((item) => item.product_id);
  }

  async toggle(userId: string, productId: string) {
    const product_id = Number(productId);
    const existing = await this.prisma.wishlist_test.findFirst({
      where: { user_id: userId, product_id },
    });

    if (existing) {
      await this.prisma.wishlist_test.delete({
        where: { wishlist_item_id: existing.wishlist_item_id },
      });
      return { action: 'removed', productId };
    }

    await this.prisma.wishlist_test.create({
      data: { user_id: userId, product_id },
    });
    return { action: 'added', productId };
  }

  async getWishlistWithDetails(userId: string) {
    const rows = await this.prisma.wishlist_test.findMany({
      where: { user_id: userId },
      orderBy: { wishlist_item_id: 'asc' },
      select: {
        products: {
          select: {
            product_id: true,
            name: true,
            price: true,
            description: true,
          },
        },
      },
    });
    return rows
      .map((item) => item.products)
      .filter((product) => product !== null)
      .map((product) => embedOrder(product));
  }
}
