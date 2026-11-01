import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/shipping-options')
export class ShippingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.shipping_options.findMany({
      where: { active: true },
      orderBy: { sort_order: 'asc' },
    });
  }
}
