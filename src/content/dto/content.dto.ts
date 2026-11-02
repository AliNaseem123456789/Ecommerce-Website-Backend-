import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/* ---------------------------------- brands --------------------------------- */

export class CreateBrandDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;
}

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;
}

/* ------------------------------- collections ------------------------------- */

export class CreateCollectionDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsISO8601()
  expires_at?: string;
}

export class UpdateCollectionDto extends CreateCollectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  declare name: string;
}

export class SetCollectionProductsDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  product_ids: number[];
}

/* -------------------------------- promotions ------------------------------- */

export class CreatePromotionDto {
  @IsString()
  @MaxLength(120)
  headline: string;

  @IsOptional()
  @IsString()
  subhead?: string;

  @IsOptional()
  @IsString()
  fine_print?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  badge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  link_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  coupon_code?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsISO8601()
  expires_at?: string;
}

export class UpdatePromotionDto extends CreatePromotionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  declare headline: string;
}

/* ----------------------------- landing sections ---------------------------- */

export class UpsertSectionDto {
  @IsString()
  @MaxLength(50)
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  @IsOptional()
  config?: unknown;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ReorderSectionsDto {
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];
}
