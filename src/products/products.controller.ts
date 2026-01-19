import { Controller, Get, Query, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { BadRequestException } from '@nestjs/common';
@Controller('api/v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('by-ids')
  async getProductsByIds(@Query('ids') ids: string) {
    if (!ids) return [];
    const idArray = ids.split(',').map((id) => Number(id));
    return this.productsService.findManyByIds(idArray);
  }
  @Get('featured')
  async getFeatured(@Query('ids') ids: string) {
    return this.productsService.getFeatured(ids);
  }
  @Get()
  async getProducts(
    @Query('categories') categories?: string,
    @Query('sort') sort?: string,
  ) {
    return this.productsService.getProducts({ categories, sort });
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new BadRequestException('Invalid Product ID format');
    }
    return this.productsService.findOne(numericId);
  }
}
