import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
@Controller('api/v1/wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}
  @Get(':userId')
  async getWishlist(@Param('userId') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }
  @Post('toggle')
  async toggleWishlist(@Body() body: { userId: string; productId: string }) {
    return this.wishlistService.toggle(body.userId, body.productId);
  }
  @Get(':userId/details')
  async getDetails(@Param('userId') userId: string) {
    return this.wishlistService.getWishlistWithDetails(userId);
  }
}
