import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/coupon.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('api/v1/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @UsePipes(pipe)
  validate(@Body() body: ValidateCouponDto) {
    return this.couponsService.validate(body.code, body.userId);
  }
}
