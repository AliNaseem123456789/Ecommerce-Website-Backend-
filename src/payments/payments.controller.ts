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
import { OwnerService } from '../auth/owner.service';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly owners: OwnerService,
  ) {}

  @Post('create-payment-intent')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )
  async createPaymentIntent(
    @Req() req: Request,
    @Body() body: CreatePaymentIntentDto,
  ) {
    // The cart being charged is always the caller's own (JWT user or guest).
    const owner = await this.owners.resolve(req, body.userId);
    return this.paymentsService.createPaymentIntent({ ...body, userId: owner.id });
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
