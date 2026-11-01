import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ShippingAddressDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;
}

export class CreatePaymentIntentDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsUUID()
  addressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  address?: ShippingAddressDto;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  shippingCode?: string;
}
