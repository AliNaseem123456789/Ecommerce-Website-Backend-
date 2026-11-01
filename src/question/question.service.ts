import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuestion(productId: string, formData: any) {
    try {
      return await this.prisma.product_questions.create({
        data: {
          product_id: Number(productId),
          ...formData,
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getQuestionsByProduct(productId: string) {
    try {
      return await this.prisma.product_questions.findMany({
        where: { product_id: Number(productId) },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
