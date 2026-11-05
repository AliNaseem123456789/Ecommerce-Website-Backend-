import { Module } from '@nestjs/common';
import { OrderController } from './orders.controller';
import { OrdersService } from './order.service';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [AuthModule, PaymentsModule],
  controllers: [OrderController],
  providers: [OrdersService],
})
export class OrdersModule {}
