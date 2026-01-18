import { IsOptional, IsString, Matches } from 'class-validator';

export class GetProductsDto {
  @IsOptional()
  @IsString()
  categories?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(price_asc|price_desc|rating)$/)
  sort?: string;
}
