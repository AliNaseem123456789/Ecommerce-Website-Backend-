import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ) {
    if (data.email) {
      const existing = await this.prisma.users_test.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email is already in use');
      }
    }
    return this.prisma.users_test.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
      },
      select: { id: true, name: true, email: true },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.users_test.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Account not found');
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.users_test.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
    return { ok: true };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.user_addresses.findFirst({
      where: { id: addressId, user_id: userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    await this.prisma.$transaction([
      this.prisma.user_addresses.updateMany({
        where: { user_id: userId },
        data: { is_default: false },
      }),
      this.prisma.user_addresses.update({
        where: { id: addressId },
        data: { is_default: true },
      }),
    ]);
    return this.getAddresses(userId);
  }
}
