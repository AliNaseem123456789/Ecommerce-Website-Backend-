import { Controller, Get, Query, Param, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ListProductsDto } from './dto/list-products.dto';
import { RelatedProductsDto } from './dto/related-products.dto';
@Controller('api/v1/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Get('suggestions')
  async getSuggestions(@Query('q') searchTerm: string) {
    return this.productsService.getSuggestions(searchTerm);
  }
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
  async getProducts(@Query() query: ListProductsDto) {
    return this.productsService.getProducts(query);
  }

  @Get('search')
  async searchProducts(@Query() query: any) {
    return this.productsService.searchProducts(query);
  }

  // Literal routes must stay above ':id'.
  @Get('best-sellers')
  bestSellers(@Query('limit') limit?: string) {
    return this.productsService.bestSellers(Number(limit) || 8);
  }

  @Get('new-arrivals')
  newArrivals(@Query('limit') limit?: string) {
    return this.productsService.newArrivals(Number(limit) || 8);
  }

  @Get('top-rated')
  topRated(@Query('limit') limit?: string) {
    return this.productsService.topRated(Number(limit) || 8);
  }

  @Get('most-wishlisted')
  mostWishlisted(@Query('limit') limit?: string) {
    return this.productsService.mostWishlisted(Number(limit) || 8);
  }

  @Get(':id/related')
  related(@Param('id') id: string, @Query() query: RelatedProductsDto) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      throw new BadRequestException('Invalid Product ID format');
    }
    return this.productsService.related(numericId, query.limit ?? 8);
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
