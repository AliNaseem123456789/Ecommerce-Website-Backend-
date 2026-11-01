import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionFormDto } from './dto/question.dto';

@Injectable()
export class QuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createQuestion(productId: string, formData: QuestionFormDto) {
    try {
      return await this.prisma.product_questions.create({
        data: {
          product_id: Number(productId),
          name: formData.name,
          email: formData.email,
          question: formData.question,
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getQuestionsByProduct(productId: string) {
    return this.prisma.product_questions.findMany({
      where: { product_id: Number(productId) },
      include: { product_answers: { orderBy: { created_at: 'asc' } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async listForAdmin() {
    const rows = await this.prisma.product_questions.findMany({
      include: {
        product_answers: { orderBy: { created_at: 'asc' } },
        products: { select: { name: true, product_id: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.sort(
      (a, b) => a.product_answers.length - b.product_answers.length,
    );
  }

  async answer(questionId: number, answer: string, answeredBy?: string) {
    const question = await this.prisma.product_questions.findUnique({
      where: { question_id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found');

    const saved = await this.prisma.product_answers.create({
      data: {
        question_id: questionId,
        answer,
        answered_by: answeredBy ?? null,
      },
    });

    await this.mailService.send(
      question.email,
      'Your question was answered',
      `<p>You asked: ${question.question}</p><p>${answer}</p>`,
    );
    return saved;
  }
}
