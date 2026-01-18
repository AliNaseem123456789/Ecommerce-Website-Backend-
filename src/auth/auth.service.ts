import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { supabase } from 'src/supabase/supabase.client';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  async register(name: string, email: string, pass: string) {
    try {
      const hashedPassword = await bcrypt.hash(pass, 10);
      const { data, error } = await supabase
        .from('users_test')
        .insert([{ name, email, password: hashedPassword }])
        .select()
        .single();
      if (error) {
        console.error('Supabase Insert Error:', error);
        throw new Error(error.message);
      }
      return this.generateToken(data);
    } catch (err) {
      console.error('Registration Logic Error:', err);
      throw err;
    }
  }
  async login(email: string, pass: string) {
    const { data: user, error } = await supabase
      .from('users_test')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !user) throw new UnauthorizedException('Invalid credentials');
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
