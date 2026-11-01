import { IsEmail, IsUUID } from 'class-validator';

export class TrackOrderDto {
  @IsUUID()
  orderId: string;

  @IsEmail()
  email: string;
}
