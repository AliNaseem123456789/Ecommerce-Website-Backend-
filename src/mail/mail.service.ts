import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async send(to: string, subject: string, html: string) {
    const key = this.configService.get<string>('RESEND_API_KEY');
    if (!to) return;
    if (!key) {
      console.log(`To: ${to}\nSubject: ${subject}\n\n${html}`);
      return;
    }
    const resend = new Resend(key);
    await resend.emails.send({
      from: this.configService.get<string>('RESEND_FROM') || 'onboarding@resend.dev',
      to,
      subject,
      html,
    });
  }

  sendPasswordReset(to: string, link: string) {
    return this.send(
      to,
      'Reset your password',
      `<p>Use this link within one hour to choose a new password.</p><p><a href="${link}">${link}</a></p>`,
    );
  }

  sendOrderReceipt(
    to: string,
    order: {
      order_id: string;
      subtotal: unknown;
      shipping: unknown;
      tax: unknown;
      total: unknown;
      order_items: { product_name?: string | null; quantity?: number | null; price?: unknown }[];
    },
  ) {
    const lines = order.order_items
      .map(
        (item) =>
          `<li>${item.product_name || 'Item'} × ${item.quantity} — ${item.price}</li>`,
      )
      .join('');
    return this.send(
      to,
      `Order ${order.order_id}`,
      `<p>Your payment was received.</p><ul>${lines}</ul><p>Subtotal ${order.subtotal}<br/>Shipping ${order.shipping}<br/>Tax ${order.tax}<br/>Total ${order.total}</p>`,
    );
  }
}
