import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewFormDto } from './dto/review.dto';
import { recalculateProductRating } from './rating';

type Author = { id: string } | null | undefined;

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async addReview(productId: string, formData: ReviewFormDto, user?: Author) {
    const product_id = Number(productId);
    if (!Number.isInteger(product_id)) {
      throw new BadRequestException('product_id is required');
    }

    return this.prisma.$transaction(async (tx) => {
      if (user?.id) {
        const existing = await tx.product_reviews.findFirst({
          where: { product_id, user_id: user.id },
        });
        if (existing) {
          throw new ConflictException(
            'You have already reviewed this product',
          );
        }
      }

      const verified = user?.id
        ? await this.hasPurchased(tx, user.id, product_id)
        : false;

      const created = await tx.product_reviews.create({
        data: {
          product_id,
          name: formData.name,
          email: formData.email,
          title: formData.title,
          review: formData.review,
          rating: formData.rating,
          user_id: user?.id ?? null,
          verified,
        },
      });
      const rating = await recalculateProductRating(tx, product_id);
      return { ...created, ...rating };
    });
  }

  async updateOwn(reviewId: number, userId: string, formData: ReviewFormDto) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.product_reviews.findUnique({
        where: { review_id: reviewId },
      });
      if (!row) throw new NotFoundException('Review not found');
      if (row.user_id !== userId) {
        throw new ForbiddenException('You can only edit your own review');
      }
      const updated = await tx.product_reviews.update({
        where: { review_id: reviewId },
        data: {
          name: formData.name,
          email: formData.email,
          title: formData.title,
          review: formData.review,
          rating: formData.rating,
        },
      });
      const rating = await recalculateProductRating(tx, row.product_id as number);
      return { ...updated, ...rating };
    });
  }

  async deleteOwn(reviewId: number, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.product_reviews.findUnique({
        where: { review_id: reviewId },
      });
      if (!row) throw new NotFoundException('Review not found');
      if (row.user_id !== userId) {
        throw new ForbiddenException('You can only delete your own review');
      }
      await tx.product_reviews.delete({ where: { review_id: reviewId } });
      return recalculateProductRating(tx, row.product_id as number);
    });
  }

  async deleteByAdmin(reviewId: number) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.product_reviews.findUnique({
        where: { review_id: reviewId },
      });
      if (!row) throw new NotFoundException('Review not found');
      await tx.product_reviews.delete({ where: { review_id: reviewId } });
      if (row.product_id != null) {
        await recalculateProductRating(tx, row.product_id);
      }
      return { deleted: true };
    });
  }

  async getByProduct(productId: string) {
    const product_id = Number(productId);
    const reviews = await this.prisma.product_reviews.findMany({
      where: { product_id },
      orderBy: { created_at: 'desc' },
    });
    return reviews;
  }

  private async hasPurchased(tx: any, userId: string, productId: number) {
    const item = await tx.order_items.findFirst({
      where: {
        product_id: productId,
        orders: {
          user_id: userId,
          OR: [
            { status: { in: ['paid', 'delivered'] } },
            { payment_status: 'paid' },
          ],
        },
      },
    });
    return Boolean(item);
  }
}
