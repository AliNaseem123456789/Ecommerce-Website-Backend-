import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateCouponDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsIn(['percent', 'fixed'])
  type: 'percent' | 'fixed';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_order?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_user_limit?: number;

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsISO8601()
  expires_at?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsIn(['percent', 'fixed'])
  type?: 'percent' | 'fixed';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_order?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_user_limit?: number;

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsISO8601()
  expires_at?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
