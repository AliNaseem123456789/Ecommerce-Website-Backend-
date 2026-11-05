import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MergeWishlistDto, ToggleWishlistDto } from './dto/wishlist.dto';
import { WishlistService } from './wishlist.service';
import { OwnerService } from '../auth/owner.service';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('api/v1/wishlist')
export class WishlistController {
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly owners: OwnerService,
  ) {}
  @Get(':userId')
  async getWishlist(@Req() req, @Param('userId') userId: string) {
    const owner = await this.owners.resolve(req, userId);
    return this.wishlistService.getWishlist(owner.id);
  }
  @Post('toggle')
  @UsePipes(pipe)
  async toggleWishlist(@Req() req, @Body() body: ToggleWishlistDto) {
    const owner = await this.owners.resolve(req, body.userId);
    return this.wishlistService.toggle(owner.id, String(body.productId));
  }

  @Post('merge')
  @UsePipes(pipe)
  async merge(@Req() req, @Body() body: MergeWishlistDto) {
    const userId = await this.owners.requireUser(req, body.userId);
    return this.wishlistService.merge(userId, body.productIds);
  }
  @Get(':userId/details')
  async getDetails(@Req() req, @Param('userId') userId: string) {
    const owner = await this.owners.resolve(req, userId);
    return this.wishlistService.getWishlistWithDetails(owner.id);
  }
}
