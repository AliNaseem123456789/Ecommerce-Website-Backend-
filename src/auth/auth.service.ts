import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(name: string, email: string, pass: string) {
    try {
      const hashedPassword = await bcrypt.hash(pass, 10);
      const data = await this.prisma.users_test.create({
        data: { name, email, password: hashedPassword },
      });
      return this.generateToken(data);
    } catch (err) {
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

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}
