import {
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import { OrdersService } from './order.service';
@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrdersService) {}

  @Get('my-orders')
  async getMyOrders(@Query('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException(
        'User ID is required for trust-based fetch',
      );
    }

    return this.orderService.getUserOrders(userId);
  }
  @Post('place')
  async placeOrder(@Body() body: any) {
    return this.orderService.createOrder(body.userId, body);
  }
}
