import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Get()
  getCategories() {
    return this.categoriesService.getCategories();
  }
}
