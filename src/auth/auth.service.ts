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

  async register(
    name: string,
    email: string,
    pass: string,
    staySignedIn?: boolean,
    userAgent?: string,
  ) {
    try {
      const hashedPassword = await bcrypt.hash(pass, 10);
      const data = await this.prisma.users_test.create({
        data: { name, email, password: hashedPassword },
      });
      return this.issueSession(data, staySignedIn, userAgent);
    } catch (err) {
      if (err?.code === 'P2002') {
        throw new ConflictException('Email is already in use');
      }
      console.error('Registration Logic Error:', err);
      throw err;
    }
  }

  async login(
    email: string,
    pass: string,
    staySignedIn?: boolean,
    userAgent?: string,
  ) {
    const user = await this.prisma.users_test.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    return this.issueSession(user, staySignedIn, userAgent);
  }

  async rotate(raw: string | undefined, userAgent?: string) {
    if (!raw) throw new UnauthorizedException('Refresh token missing');
    const token_hash = this.hashToken(raw);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.refresh_tokens.findUnique({
        where: { token_hash },
        include: { users_test: true },
      });
      if (!row || row.revoked_at || row.expires_at.getTime() < Date.now()) {
        throw new UnauthorizedException('Refresh token is not valid');
      }
      const revoked = await tx.refresh_tokens.updateMany({
        where: { id: row.id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      if (revoked.count !== 1) {
        throw new UnauthorizedException('Refresh token is not valid');
      }
      const span =
        row.expires_at.getTime() - (row.created_at?.getTime() ?? Date.now());
      const staySignedIn = span > 10 * 24 * 60 * 60 * 1000;
      const refreshDays = staySignedIn ? 30 : 7;
      const refreshToken = await this.storeRefresh(
        tx,
        row.user_id,
        refreshDays,
        userAgent,
      );
      return {
        ...this.accessFor(row.users_test),
        refreshToken,
        refreshDays,
      };
    });
  }

  async revoke(raw?: string) {
    if (!raw) return { ok: true };
    await this.prisma.refresh_tokens.updateMany({
      where: { token_hash: this.hashToken(raw), revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return { ok: true };
  }

  async revokeAll(userId: string) {
    await this.prisma.refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return { ok: true };
  }

  listSessions(userId: string) {
    return this.prisma.refresh_tokens.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
      select: { id: true, user_agent: true, created_at: true, expires_at: true },
    });
  }

  async revokeSession(userId: string, id: string) {
    const row = await this.prisma.refresh_tokens.findFirst({
      where: { id, user_id: userId, revoked_at: null },
    });
    if (!row) throw new UnauthorizedException('Session not found');
    await this.prisma.refresh_tokens.update({
      where: { id },
      data: { revoked_at: new Date() },
    });
    return { ok: true };
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

  private accessFor(user: {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
  }) {
    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  private async issueSession(user, staySignedIn?: boolean, userAgent?: string) {
    const refreshDays = staySignedIn === false ? 7 : 30;
    const refreshToken = await this.storeRefresh(
      this.prisma,
      user.id,
      refreshDays,
      userAgent,
    );
    return { ...this.accessFor(user), refreshToken, refreshDays };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async storeRefresh(db, userId: string, days: number, userAgent?: string) {
    const refreshToken = randomBytes(32).toString('hex');
    await db.refresh_tokens.create({
      data: {
        user_id: userId,
        token_hash: this.hashToken(refreshToken),
        expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        user_agent: userAgent ? String(userAgent).slice(0, 300) : null,
      },
    });
    return refreshToken;
  }
}
