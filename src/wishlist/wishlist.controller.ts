import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MergeWishlistDto, ToggleWishlistDto } from './dto/wishlist.dto';
import { WishlistService } from './wishlist.service';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('api/v1/wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}
  @Get(':userId')
  async getWishlist(@Param('userId') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }
  @Post('toggle')
  @UsePipes(pipe)
  async toggleWishlist(@Body() body: ToggleWishlistDto) {
    return this.wishlistService.toggle(body.userId, String(body.productId));
  }

  @Post('merge')
  @UsePipes(pipe)
  merge(@Body() body: MergeWishlistDto) {
    return this.wishlistService.merge(body.userId, body.productIds);
  }
  @Get(':userId/details')
  async getDetails(@Param('userId') userId: string) {
    return this.wishlistService.getWishlistWithDetails(userId);
  }
}
