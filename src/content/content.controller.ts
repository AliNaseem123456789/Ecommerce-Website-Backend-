import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';

/** Public, unauthenticated storefront endpoints. */
@Controller('api/v1')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('brands')
  brands(@Query('featured') featured?: string) {
    return featured === 'true'
      ? this.content.listFeaturedBrands()
      : this.content.listBrands();
  }

  @Get('brands/:slug')
  brand(@Param('slug') slug: string) {
    return this.content.getBrandBySlug(slug);
  }

  @Get('collections')
  collections() {
    return this.content.listLiveCollections();
  }

  @Get('collections/:slug')
  collection(@Param('slug') slug: string) {
    return this.content.getCollectionBySlug(slug);
  }

  @Get('promotions')
  promotions() {
    return this.content.listLivePromotions();
  }

  @Get('landing/sections')
  sections() {
    return this.content.listActiveSections();
  }
}
