import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { QuestionService } from './question.service';

@Controller('api/v1/questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}
  @Post()
  async askQuestion(@Body() body: { product_id: string; formData: any }) {
    return this.questionService.createQuestion(body.product_id, body.formData);
  }
  @Get(':productId')
  async getQuestions(@Param('productId') productId: string) {
    return this.questionService.getQuestionsByProduct(productId);
  }
}
