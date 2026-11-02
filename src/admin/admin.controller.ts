import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import {
  CreateCategoryDto,
  CreateProductDto,
  ListOrdersDto,
  ProductImageDto,
  ReorderImagesDto,
  UpdateCategoryDto,
  UpdateOrderStatusDto,
  UpdateOrderTrackingDto,
  UpdateProductDto,
} from './dto/admin.dto';
import type { UploadedImage } from './admin.service';
import { AnswerQuestionDto } from '../question/dto/question.dto';
import { CreateCouponDto, UpdateCouponDto } from '../coupons/dto/coupon.dto';

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

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.adminService.getProduct(Number(id));
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

  // ----- product image gallery -----

  @Get('products/:id/images')
  listImages(@Param('id') id: string) {
    return this.adminService.listImages(Number(id));
  }

  @Post('products/:id/images')
  @UseInterceptors(FilesInterceptor('files', 6))
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: UploadedImage[],
  ) {
    return this.adminService.uploadImages(Number(id), files);
  }

  @Delete('products/:id/images/:imageId')
  deleteImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.adminService.deleteImage(Number(id), Number(imageId));
  }

  @Patch('products/:id/images/reorder')
  @UsePipes(pipe)
  reorderImages(@Param('id') id: string, @Body() body: ReorderImagesDto) {
    return this.adminService.reorderImages(Number(id), body.ids);
  }

  @Patch('products/:id/images/:imageId/primary')
  setPrimaryImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.adminService.setPrimaryImage(Number(id), Number(imageId));
  }

  // ----- categories -----

  @Get('categories')
  categories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  createCategory(@Body() body: CreateCategoryDto) {
    return this.adminService.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.adminService.updateCategory(Number(id), body);
  }

  @Post('categories/:id/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadCategoryImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImage,
  ) {
    return this.adminService.uploadCategoryImage(Number(id), file);
  }

  @Get('orders')
  orders(@Query() query: ListOrdersDto) {
    return this.adminService.listOrders(query.status);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }

  @Patch('orders/:id/tracking')
  @UsePipes(pipe)
  updateTracking(@Param('id') id: string, @Body() body: UpdateOrderTrackingDto) {
    return this.adminService.updateTracking(id, body);
  }

  @Patch('orders/:id/status')
  @UsePipes(pipe)
  updateOrder(@Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, body);
  }

  @Get('coupons')
  coupons() {
    return this.adminService.listCoupons();
  }

  @Post('coupons')
  @UsePipes(pipe)
  createCoupon(@Body() body: CreateCouponDto) {
    return this.adminService.createCoupon(body);
  }

  @Patch('coupons/:id')
  @UsePipes(pipe)
  updateCoupon(@Param('id') id: string, @Body() body: UpdateCouponDto) {
    return this.adminService.updateCoupon(id, body);
  }

  @Delete('coupons/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.adminService.deleteCoupon(id);
  }

  @Get('customers')
  customers() {
    return this.adminService.listCustomers();
  }

  @Get('reviews')
  reviews() {
    return this.adminService.listReviews();
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id') id: string) {
    return this.adminService.deleteReview(Number(id));
  }

  @Get('questions')
  questions() {
    return this.adminService.listQuestions();
  }

  @Post('questions/:id/answer')
  @UsePipes(pipe)
  answerQuestion(
    @Req() req,
    @Param('id') id: string,
    @Body() body: AnswerQuestionDto,
  ) {
    return this.adminService.answerQuestion(Number(id), body.answer, req.user?.id);
  }
}
