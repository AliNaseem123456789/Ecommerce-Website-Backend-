import { Body, Controller, Post, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { OwnerService } from '../auth/owner.service';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/coupon.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('api/v1/coupons')
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly owners: OwnerService,
  ) {}

  @Post('validate')
  @UsePipes(pipe)
  async validate(@Req() req, @Body() body: ValidateCouponDto) {
    // Quote against the caller's own cart only; anonymous callers get no cart.
    const owner = await this.owners
      .resolve(req, body.userId)
      .catch(() => null);
    return this.couponsService.validate(body.code, owner?.id);
  }
}
