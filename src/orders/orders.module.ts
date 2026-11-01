import { Module } from '@nestjs/common';
import { OrderController } from './orders.controller';
import { OrdersService } from './order.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OrderController],
  providers: [OrdersService],
})
export class OrdersModule {}
