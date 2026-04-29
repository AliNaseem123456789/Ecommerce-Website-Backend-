import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { AccountService } from './account.service';

@Controller('/api/v1/account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}
  @Get('addresses/:userId')
  async getAddresses(@Param('userId') userId: string) {
    return this.accountService.getAddresses(userId);
  }

  @Post('addresses/:userId')
  async saveAddress(
    @Param('userId') userId: string,
    @Body() body: { type: string; formData: any },
  ) {
    return this.accountService.upsertAddress(userId, body.type, body.formData);
  }
  @Delete('addresses/:userId/:addressId')
  async deleteAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
  ) {
    console.log(
      `DELETE request received for userId: ${userId}, addressId: ${addressId}`,
    );
    return this.accountService.deleteAddress(userId, addressId);
  }
}
