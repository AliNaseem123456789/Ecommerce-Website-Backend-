import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-intent')
  async createPaymentIntent(@Body() body: { amount: number }) {
    return this.paymentsService.createPaymentIntent(body.amount);
  }
}
