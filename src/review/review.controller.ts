import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { CreateReviewDto, ReviewFormDto } from './dto/review.dto';
import { ReviewService } from './review.service';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('api/v1/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(OptionalJwtGuard)
  @UsePipes(pipe)
  createReview(@Req() req, @Body() body: CreateReviewDto) {
    return this.reviewService.addReview(
      body.product_id,
      body.formData,
      req.user,
    );
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(pipe)
  updateReview(@Req() req, @Param('id') id: string, @Body() body: ReviewFormDto) {
    return this.reviewService.updateOwn(Number(id), req.user.id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  deleteReview(@Req() req, @Param('id') id: string) {
    return this.reviewService.deleteOwn(Number(id), req.user.id);
  }

  @Get(':productId')
  getProductReviews(@Param('productId') productId: string) {
    return this.reviewService.getByProduct(productId);
  }
}
