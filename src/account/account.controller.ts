import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccountService } from './account.service';
import { ChangePasswordDto, UpdateProfileDto } from './dto/account.dto';

const accountPipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('/api/v1/account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(accountPipe)
  updateProfile(@Req() req, @Body() body: UpdateProfileDto) {
    return this.accountService.updateProfile(req.user.id, body);
  }

  @Post('password')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(accountPipe)
  changePassword(@Req() req, @Body() body: ChangePasswordDto) {
    return this.accountService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

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
