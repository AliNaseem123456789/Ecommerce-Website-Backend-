import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async register(name: string, email: string, pass: string) {
    try {
      const hashedPassword = await bcrypt.hash(pass, 10);
      const data = await this.prisma.users_test.create({
        data: { name, email, password: hashedPassword },
      });
      return this.generateToken(data);
    } catch (err) {
      if (err?.code === 'P2002') {
        throw new ConflictException('Email is already in use');
      }
      console.error('Registration Logic Error:', err);
      throw err;
    }
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.users_test.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    return this.generateToken(user);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.users_test.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const token_hash = createHash('sha256').update(token).digest('hex');
      await this.prisma.password_reset_tokens.create({
        data: {
          user_id: user.id,
          token_hash,
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const frontend =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      await this.mailService.sendPasswordReset(
        email,
        `${frontend}/reset-password?token=${token}`,
      );
    }
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const token_hash = createHash('sha256').update(token).digest('hex');
    const row = await this.prisma.password_reset_tokens.findUnique({
      where: { token_hash },
    });
    if (!row || row.used_at || row.expires_at.getTime() < Date.now()) {
      throw new BadRequestException('This reset link is invalid or expired');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.users_test.update({
        where: { id: row.user_id },
        data: { password: passwordHash },
      }),
      this.prisma.password_reset_tokens.update({
        where: { id: row.id },
        data: { used_at: new Date() },
      }),
    ]);
    return { ok: true };
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}
