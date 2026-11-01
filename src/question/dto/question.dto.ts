import { Type } from 'class-transformer';
import { IsEmail, IsString, MaxLength, ValidateNested } from 'class-validator';

export class QuestionFormDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  question: string;
}

export class CreateQuestionDto {
  @IsString()
  product_id: string;

  @ValidateNested()
  @Type(() => QuestionFormDto)
  formData: QuestionFormDto;
}

export class AnswerQuestionDto {
  @IsString()
  answer: string;
}
