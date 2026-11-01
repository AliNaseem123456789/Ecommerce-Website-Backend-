import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async addReview(productId: string, formData: any) {
    try {
      return await this.prisma.product_reviews.create({
        data: {
          product_id: Number(productId),
          ...formData,
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getByProduct(productId: string) {
    try {
      return await this.prisma.product_reviews.findMany({
        where: { product_id: Number(productId) },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
