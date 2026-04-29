import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Post('signup')
  async signup(@Body() body: any) {
    return this.authService.register(body.name, body.email, body.password);
  }
  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return {
      user: req.user,
      success: true,
    };
  }
}
