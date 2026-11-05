import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ToggleWishlistDto {
  /** Legacy: must match the caller when given. */
  @IsOptional()
  @IsString()
  userId?: string;

  @Type(() => Number)
  @IsInt()
  productId: number;
}

export class MergeWishlistDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  productIds: number[];
}
