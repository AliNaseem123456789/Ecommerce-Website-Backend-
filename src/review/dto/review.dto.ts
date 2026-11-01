import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReviewFormDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  review: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
}

export class CreateReviewDto {
  @IsString()
  product_id: string;

  @ValidateNested()
  @Type(() => ReviewFormDto)
  formData: ReviewFormDto;
}
