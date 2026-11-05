import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OwnerService } from '../auth/owner.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CancelOrderDto,
  ResolveOrderRequestDto,
  ReturnRequestDto,
} from './dto/order-request.dto';
import { TrackOrderDto } from './dto/track-order.dto';
import { OrdersService } from './order.service';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('api/v1/orders')
export class OrderController {
  constructor(
    private readonly orderService: OrdersService,
    private readonly owners: OwnerService,
  ) {}

  /** Signed-in users only. `?userId=` is accepted for old clients but must match the token. */
  @Get('my-orders')
  async getMyOrders(@Req() req, @Query('userId') userId?: string) {
    const owner = await this.owners.requireUser(req, userId);
    return this.orderService.getUserOrders(owner);
  }

  @Post('track')
  @UsePipes(pipe)
  track(@Body() body: TrackOrderDto) {
    return this.orderService.track(body.orderId, body.email);
  }

  @Get('requests')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listRequests(@Query('status') status?: string) {
    return this.orderService.listRequests(status);
  }

  @Patch('requests/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @UsePipes(pipe)
  resolveRequest(@Param('id') id: string, @Body() body: ResolveOrderRequestDto) {
    return this.orderService.resolveRequest(id, body.status, body.note);
  }

  @Get(':id/eligibility')
  @UseGuards(AuthGuard('jwt'))
  eligibility(@Req() req, @Param('id') id: string) {
    return this.orderService.eligibility(req.user.id, id);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(pipe)
  cancel(@Req() req, @Param('id') id: string, @Body() body: CancelOrderDto) {
    return this.orderService.cancel(req.user.id, id, body.reason);
  }

  @Post(':id/return-request')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(pipe)
  requestReturn(@Req() req, @Param('id') id: string, @Body() body: ReturnRequestDto) {
    return this.orderService.requestReturn(req.user.id, id, body.reason, body.itemIds);
  }

  @Get(':id')
  getOrder(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.orderService.getOrder(id, authorization);
  }
}
