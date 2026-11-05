import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReturnRequestDto {
  @IsString()
  @MaxLength(1000)
  reason: string;

  /** order_items.item_id values; empty/omitted means the whole order. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @Type(() => Number)
  @IsInt({ each: true })
  itemIds?: number[];
}

export class ResolveOrderRequestDto {
  @IsIn(['approved', 'rejected', 'completed'])
  status: 'approved' | 'rejected' | 'completed';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
