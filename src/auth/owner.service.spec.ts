import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { OwnerService } from './owner.service';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function make(accounts: string[] = [USER, OTHER]) {
  const jwt = {
    verify: jest.fn((token: string) => {
      if (token === 'good') return { sub: USER };
      throw new Error('bad token');
    }),
  };
  const prisma = {
    users_test: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(accounts.includes(where.id) ? { id: where.id } : null),
      ),
    },
  };
  return new OwnerService(jwt as any, prisma as any);
}

const req = (headers: Record<string, string> = {}) => ({ headers });

describe('OwnerService', () => {
  it('uses the JWT subject', async () => {
    await expect(make().resolve(req({ authorization: 'Bearer good' }))).resolves.toEqual({
      id: USER,
      isGuest: false,
    });
  });

  it('rejects a JWT user claiming another account', async () => {
    await expect(
      make().resolve(req({ authorization: 'Bearer good' }), OTHER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invalid token instead of falling back to guest', async () => {
    await expect(
      make().resolve(req({ authorization: 'Bearer nope', 'x-guest-id': 'guest_abcdef12' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows a guest id that is not an account', async () => {
    await expect(make().resolve(req({ 'x-guest-id': 'guest_abcdef12' }))).resolves.toEqual({
      id: 'guest_abcdef12',
      isGuest: true,
    });
  });

  it('never lets a guest act as a registered user', async () => {
    await expect(make().resolve(req(), USER)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(make().resolve(req({ 'x-guest-id': USER }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('requireUser needs a token', async () => {
    await expect(make().requireUser(req())).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(make().requireUser(req({ authorization: 'Bearer good' }))).resolves.toBe(USER);
  });
});
