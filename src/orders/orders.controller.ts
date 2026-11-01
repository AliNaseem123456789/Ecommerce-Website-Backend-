import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TrackOrderDto } from './dto/track-order.dto';
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

  @Post('track')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  track(@Body() body: TrackOrderDto) {
    return this.orderService.track(body.orderId, body.email);
  }

  @Get(':id')
  getOrder(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.orderService.getOrder(id, authorization);
  }
}
