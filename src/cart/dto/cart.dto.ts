import { IsString, IsUUID } from 'class-validator';

export class MergeCartDto {
  @IsString()
  guestId: string;

  @IsUUID()
  userId: string;
}
