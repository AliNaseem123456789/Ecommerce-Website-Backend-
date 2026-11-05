import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export type Owner = { id: string; isGuest: boolean };

const GUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Works out who a request is acting for.
 *
 * - A valid `Authorization: Bearer <jwt>` wins: the owner is the token's `sub`.
 * - Otherwise the caller is a guest identified by `x-guest-id` (or, for older
 *   clients, the id they put in the URL/body). A guest id may never be the id
 *   of a registered account, so nobody can act for a real user without their
 *   token.
 */
@Injectable()
export class OwnerService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private tokenUser(req: any): string | null {
    const header: string | undefined = req?.headers?.authorization;
    if (!header) return null;
    const token = header.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    try {
      const payload = this.jwt.verify<{ sub?: string }>(token);
      if (!payload.sub) throw new Error('no sub');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
  }

  /** Throws unless `id` is a well-formed guest id that is not a registered account. */
  async assertGuest(id: string) {
    if (!GUEST_ID.test(id)) {
      throw new UnauthorizedException('Sign in or provide a valid guest id');
    }
    const uuidLike = /^[0-9a-f-]{36}$/i.test(id);
    if (uuidLike) {
      const account = await this.prisma.users_test.findUnique({
        where: { id },
        select: { id: true },
      });
      if (account) {
        throw new UnauthorizedException('Sign in to access this account');
      }
    }
  }

  /** Owner for routes that allow guests. `claimed` is a legacy id from the URL/body. */
  async resolve(req: any, claimed?: string | null): Promise<Owner> {
    const userId = this.tokenUser(req);
    if (userId) {
      if (claimed && claimed !== userId && !(await this.isGuestOf(claimed))) {
        throw new ForbiddenException('That belongs to another account');
      }
      return { id: userId, isGuest: false };
    }
    const guestId = (req?.headers?.['x-guest-id'] as string) || claimed || '';
    if (claimed && claimed !== guestId) {
      throw new ForbiddenException('That belongs to another guest');
    }
    await this.assertGuest(guestId);
    return { id: guestId, isGuest: true };
  }

  /** Owner for routes that need a signed-in user. */
  async requireUser(req: any, claimed?: string | null): Promise<string> {
    const userId = this.tokenUser(req);
    if (!userId) throw new UnauthorizedException('Please sign in first');
    if (claimed && claimed !== userId) {
      throw new ForbiddenException('That belongs to another account');
    }
    return userId;
  }

  // A signed-in user may still pass their old guest id (e.g. legacy cart URLs
  // right after login). Treat a non-account id as "theirs to merge", never
  // another user's.
  private async isGuestOf(id: string) {
    if (!GUEST_ID.test(id)) return false;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return true;
    const account = await this.prisma.users_test.findUnique({
      where: { id },
      select: { id: true },
    });
    return !account;
  }
}
