import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ContentService, SECTION_TYPES, RAIL_SOURCES } from './content.service';
import type { UploadedImage } from '../common/image-upload';
import {
  CreateBrandDto,
  CreateCollectionDto,
  CreatePromotionDto,
  ReorderSectionsDto,
  SetCollectionProductsDto,
  UpdateBrandDto,
  UpdateCollectionDto,
  UpdatePromotionDto,
  UpsertSectionDto,
} from './dto/content.dto';

@Controller('api/v1/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  /* -------------------------------- brands ------------------------------- */

  @Get('brands')
  brands() {
    return this.content.listBrands();
  }

  @Post('brands')
  createBrand(@Body() body: CreateBrandDto) {
    return this.content.createBrand(body);
  }

  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Body() body: UpdateBrandDto) {
    return this.content.updateBrand(Number(id), body);
  }

  @Delete('brands/:id')
  deleteBrand(@Param('id') id: string) {
    return this.content.deleteBrand(Number(id));
  }

  @Post('brands/:id/logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadBrandLogo(@Param('id') id: string, @UploadedFile() file: UploadedImage) {
    return this.content.uploadBrandLogo(Number(id), file);
  }

  /* ----------------------------- collections ----------------------------- */

  @Get('collections')
  collections() {
    return this.content.listCollections();
  }

  @Get('collections/:id/products')
  collectionProducts(@Param('id') id: string) {
    return this.content.collectionProducts(Number(id));
  }

  @Post('collections')
  createCollection(@Body() body: CreateCollectionDto) {
    return this.content.createCollection(body);
  }

  @Patch('collections/:id')
  updateCollection(@Param('id') id: string, @Body() body: UpdateCollectionDto) {
    return this.content.updateCollection(Number(id), body);
  }

  @Delete('collections/:id')
  deleteCollection(@Param('id') id: string) {
    return this.content.deleteCollection(Number(id));
  }

  @Put('collections/:id/products')
  setCollectionProducts(
    @Param('id') id: string,
    @Body() body: SetCollectionProductsDto,
  ) {
    return this.content.setCollectionProducts(Number(id), body.product_ids);
  }

  @Post('collections/:id/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadCollectionImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImage,
  ) {
    return this.content.uploadCollectionImage(Number(id), file);
  }

  /* ------------------------------ promotions ----------------------------- */

  @Get('promotions')
  promotions() {
    return this.content.listPromotions();
  }

  @Post('promotions')
  createPromotion(@Body() body: CreatePromotionDto) {
    return this.content.createPromotion(body);
  }

  @Patch('promotions/:id')
  updatePromotion(@Param('id') id: string, @Body() body: UpdatePromotionDto) {
    return this.content.updatePromotion(Number(id), body);
  }

  @Delete('promotions/:id')
  deletePromotion(@Param('id') id: string) {
    return this.content.deletePromotion(Number(id));
  }

  @Post('promotions/:id/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadPromotionImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImage,
  ) {
    return this.content.uploadPromotionImage(Number(id), file);
  }

  /* --------------------------- landing sections -------------------------- */

  @Get('landing/meta')
  sectionMeta() {
    return { types: SECTION_TYPES, railSources: RAIL_SOURCES };
  }

  @Get('landing/sections')
  sections() {
    return this.content.listSections();
  }

  @Post('landing/sections')
  createSection(@Body() body: UpsertSectionDto) {
    return this.content.createSection(body);
  }

  @Patch('landing/sections/reorder')
  reorderSections(@Body() body: ReorderSectionsDto) {
    return this.content.reorderSections(body.ids);
  }

  @Patch('landing/sections/:id')
  updateSection(@Param('id') id: string, @Body() body: UpsertSectionDto) {
    return this.content.updateSection(Number(id), body);
  }

  @Delete('landing/sections/:id')
  deleteSection(@Param('id') id: string) {
    return this.content.deleteSection(Number(id));
  }
}
