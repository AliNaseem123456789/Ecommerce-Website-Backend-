import { Module } from '@nestjs/common';
import { OrderController } from './orders.controller';
import { OrdersService } from './order.service';

@Module({
  controllers: [OrderController],
  providers: [OrdersService],
})
export class OrdersModule {}
