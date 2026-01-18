import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('api/v1/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(':userId')
  getCart(@Param('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('add')
  addToCart(@Body() body: any) {
    return this.cartService.addItem(
      body.userId,
      body.productId,
      body.quantity || 1,
    );
  }

  @Put('update')
  updateQuantity(@Body() body: any) {
    return this.cartService.updateQty(body.cartItemId, body.quantity);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cartService.removeItem(id);
  }
}
