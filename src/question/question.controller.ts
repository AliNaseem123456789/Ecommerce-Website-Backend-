import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/question.dto';
import { QuestionService } from './question.service';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('api/v1/questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @UsePipes(pipe)
  askQuestion(@Body() body: CreateQuestionDto) {
    return this.questionService.createQuestion(body.product_id, body.formData);
  }

  @Get(':productId')
  getQuestions(@Param('productId') productId: string) {
    return this.questionService.getQuestionsByProduct(productId);
  }
}
