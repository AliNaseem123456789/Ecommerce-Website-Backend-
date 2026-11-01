import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  SignupDto,
} from './dto/auth.dto';

const authPipe = new ValidationPipe({ whitelist: true, transform: true });
const authThrottle = { default: { limit: 5, ttl: 60000 } };
const REFRESH_COOKIE = 'refresh_token';

function cookieOptions(_req, days?: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/api/v1/auth',
    ...(days ? { maxAge: days * 24 * 60 * 60 * 1000 } : {}),
  };
}

function readCookie(req, name: string) {
  const header = req.headers?.cookie || '';
  const match = header.split(';').find((part) => part.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @HttpCode(201)
  @UseGuards(ThrottlerGuard)
  @Throttle(authThrottle)
  @UsePipes(authPipe)
  async signup(@Body() body: SignupDto, @Req() req, @Res({ passthrough: true }) res) {
    const session = await this.authService.register(
      body.name,
      body.email,
      body.password,
      body.staySignedIn,
      req.headers['user-agent'],
    );
    this.writeRefresh(res, req, session);
    return { access_token: session.access_token, user: session.user };
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle(authThrottle)
  @UsePipes(authPipe)
  async login(@Body() body: LoginDto, @Req() req, @Res({ passthrough: true }) res) {
    const session = await this.authService.login(
      body.email,
      body.password,
      body.staySignedIn,
      req.headers['user-agent'],
    );
    this.writeRefresh(res, req, session);
    return { access_token: session.access_token, user: session.user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req, @Res({ passthrough: true }) res) {
    const session = await this.authService.rotate(
      readCookie(req, REFRESH_COOKIE),
      req.headers['user-agent'],
    );
    this.writeRefresh(res, req, session);
    return { access_token: session.access_token, user: session.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req, @Res({ passthrough: true }) res) {
    const result = await this.authService.revoke(readCookie(req, REFRESH_COOKIE));
    res.clearCookie(REFRESH_COOKIE, cookieOptions(req));
    return result;
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  async logoutAll(@Req() req, @Res({ passthrough: true }) res) {
    const result = await this.authService.revokeAll(req.user.id);
    res.clearCookie(REFRESH_COOKIE, cookieOptions(req));
    return result;
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  sessions(@Req() req) {
    return this.authService.listSessions(req.user.id);
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard('jwt'))
  revokeSession(@Req() req, @Param('id') id: string) {
    return this.authService.revokeSession(req.user.id, id);
  }

  private writeRefresh(res, req, session: { refreshToken: string; refreshDays: number }) {
    res.cookie(
      REFRESH_COOKIE,
      session.refreshToken,
      cookieOptions(req, session.refreshDays),
    );
  }

  @Post('forgot-password')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle(authThrottle)
  @UsePipes(authPipe)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @UsePipes(authPipe)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
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
