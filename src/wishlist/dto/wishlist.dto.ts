import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsString, IsUUID } from 'class-validator';

export class ToggleWishlistDto {
  @IsString()
  userId: string;

  @Type(() => Number)
  @IsInt()
  productId: number;
}

export class MergeWishlistDto {
  @IsUUID()
  userId: string;

  @IsArray()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  productIds: number[];
}
