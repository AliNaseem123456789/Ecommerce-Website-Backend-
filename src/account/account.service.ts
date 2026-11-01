import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ADDRESS_FIELDS = [
  'first_name',
  'last_name',
  'company',
  'country',
  'street',
  'apartment',
  'city',
  'state',
  'postal_code',
  'phone',
  'email',
] as const;

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getAddresses(userId: string) {
    try {
      return await this.prisma.user_addresses.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'asc' },
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async upsertAddress(userId: string, type: string, formData: any) {
    const data: Record<string, string | null> = {};
    for (const field of ADDRESS_FIELDS) {
      if (formData?.[field] !== undefined) data[field] = formData[field];
    }

    try {
      return await this.prisma.user_addresses.upsert({
        where: {
          user_id_type: { user_id: userId, type },
        },
        create: { user_id: userId, type, ...data },
        update: data,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.prisma.user_addresses.findFirst({
      where: { id: addressId, user_id: userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `Address with ID ${addressId} not found for this user`,
      );
    }

    try {
      await this.prisma.user_addresses.delete({
        where: { id: addressId },
      });
    } catch (error) {
      throw new BadRequestException(`Failed to delete address: ${error.message}`);
    }

    return {
      success: true,
      message: 'Address deleted successfully',
      deletedId: addressId,
    };
  }
}
