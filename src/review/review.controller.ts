import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ReviewService } from './review.service';

@Controller('api/v1/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  async createReview(@Body() body: { product_id: string; formData: any }) {
    return this.reviewService.addReview(body.product_id, body.formData);
  }

  @Get(':productId')
  async getProductReviews(@Param('productId') productId: string) {
    return this.reviewService.getByProduct(productId);
  }
}
