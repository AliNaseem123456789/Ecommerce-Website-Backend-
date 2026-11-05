import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class MergeCartDto {
  @IsString()
  guestId: string;

  /** Ignored: the signed-in user comes from the JWT. Kept for older clients. */
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class AddCartItemDto {
  /** Legacy: ignored when a JWT or x-guest-id header is present. */
  @IsOptional()
  @IsString()
  userId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity?: number = 1;
}

export class UpdateCartItemDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @Type(() => String)
  @IsString()
  cartItemId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;
}
