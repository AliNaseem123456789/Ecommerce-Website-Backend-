import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

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
}
