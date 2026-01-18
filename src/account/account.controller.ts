import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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
}
