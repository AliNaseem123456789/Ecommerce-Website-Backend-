import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OwnerService } from '../auth/owner.service';
import { CartService } from './cart.service';
import { AddCartItemDto, MergeCartDto, UpdateCartItemDto } from './dto/cart.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

/**
 * Every route acts for the caller resolved by OwnerService: the JWT user, or a
 * guest via `x-guest-id`. Ids in URLs/bodies are only accepted when they match.
 */
@Controller('api/v1/cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly owners: OwnerService,
  ) {}

  @Get()
  async getMyCart(@Req() req) {
    const owner = await this.owners.resolve(req);
    return this.cartService.getCart(owner.id);
  }

  @Post('merge')
  @UsePipes(pipe)
  async merge(@Req() req, @Body() body: MergeCartDto) {
    const userId = await this.owners.requireUser(req, body.userId);
    await this.owners.assertGuest(body.guestId);
    return this.cartService.mergeCarts(body.guestId, userId);
  }

  @Post('add')
  @UsePipes(pipe)
  async addToCart(@Req() req, @Body() body: AddCartItemDto) {
    const owner = await this.owners.resolve(req, body.userId);
    return this.cartService.addItem(owner.id, body.productId, body.quantity ?? 1);
  }

  @Put('update')
  @UsePipes(pipe)
  async updateQuantity(@Req() req, @Body() body: UpdateCartItemDto) {
    const owner = await this.owners.resolve(req, body.userId);
    return this.cartService.updateQty(owner.id, body.cartItemId, body.quantity);
  }

  @Delete('clear')
  async clearMyCart(@Req() req) {
    const owner = await this.owners.resolve(req);
    return this.cartService.clearCart(owner.id);
  }

  @Delete('clear/:userId')
  async clearCart(@Req() req, @Param('userId') userId: string) {
    const owner = await this.owners.resolve(req, userId);
    return this.cartService.clearCart(owner.id);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    const owner = await this.owners.resolve(req);
    return this.cartService.removeItem(owner.id, id);
  }

  /** Legacy: GET /cart/:userId. Only returns the caller's own cart. */
  @Get(':userId')
  async getCart(@Req() req, @Param('userId') userId: string) {
    const owner = await this.owners.resolve(req, userId);
    return this.cartService.getCart(owner.id);
  }
}
