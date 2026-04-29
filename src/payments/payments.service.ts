import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private stripe: Stripe.Stripe;
  constructor(private configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined in environment variables',
      );
    }

    this.stripe = new Stripe(stripeKey);
  }

  async createPaymentIntent(amount: number) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          integration_check: 'accept_a_payment',
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      throw new Error(
        `Failed to create payment intent: ${(error as Error).message}`,
      );
    }
  }
}
