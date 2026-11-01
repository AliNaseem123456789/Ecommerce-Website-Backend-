import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import {
  CreateProductDto,
  ListOrdersDto,
  ProductImageDto,
  UpdateOrderStatusDto,
  UpdateProductDto,
} from './dto/admin.dto';

const pipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('api/v1/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  summary() {
    return this.adminService.summary();
  }

  @Get('products')
  products() {
    return this.adminService.listProducts();
  }

  @Post('products')
  @UsePipes(pipe)
  createProduct(@Body() body: CreateProductDto) {
    return this.adminService.createProduct(body);
  }

  @Patch('products/:id')
  @UsePipes(pipe)
  updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.adminService.updateProduct(Number(id), body);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(Number(id));
  }

  @Post('products/:id/image')
  @UsePipes(pipe)
  uploadImage(@Param('id') id: string, @Body() body: ProductImageDto) {
    return this.adminService.uploadImage(Number(id), body.dataUrl);
  }

  @Get('orders')
  orders(@Query() query: ListOrdersDto) {
    return this.adminService.listOrders(query.status);
  }

  @Patch('orders/:id/status')
  @UsePipes(pipe)
  updateOrder(@Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, body);
  }

  @Get('customers')
  customers() {
    return this.adminService.listCustomers();
  }
}
