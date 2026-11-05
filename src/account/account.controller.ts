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
import { OwnerService } from '../auth/owner.service';
import {
  ChangePasswordDto,
  SetDefaultAddressDto,
  UpdateProfileDto,
} from './dto/account.dto';

const accountPipe = new ValidationPipe({ whitelist: true, transform: true });

@Controller('/api/v1/account')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly owners: OwnerService,
  ) {}

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

  @Post('addresses/default')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(accountPipe)
  setDefault(@Req() req, @Body() body: SetDefaultAddressDto) {
    return this.accountService.setDefaultAddress(req.user.id, body.addressId);
  }

  @Get('addresses')
  @UseGuards(AuthGuard('jwt'))
  getMyAddresses(@Req() req) {
    return this.accountService.getAddresses(req.user.id);
  }

  @Get('addresses/:userId')
  async getAddresses(@Req() req, @Param('userId') userId: string) {
    const owner = await this.owners.requireUser(req, userId);
    return this.accountService.getAddresses(owner);
  }

  @Post('addresses/:userId')
  async saveAddress(
    @Req() req,
    @Param('userId') userId: string,
    @Body() body: { type: string; formData: any },
  ) {
    const owner = await this.owners.requireUser(req, userId);
    return this.accountService.upsertAddress(owner, body.type, body.formData);
  }
  @Delete('addresses/:userId/:addressId')
  async deleteAddress(
    @Req() req,
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
  ) {
    const owner = await this.owners.requireUser(req, userId);
    return this.accountService.deleteAddress(owner, addressId);
  }
}
