import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-intent')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )
  createPaymentIntent(@Body() body: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(body);
  }

  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    return this.paymentsService.handleWebhook(payload, signature);
  }
}
