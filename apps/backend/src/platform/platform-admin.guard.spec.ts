import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';

function makeContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  const guard = new PlatformAdminGuard();

  it('permite el acceso cuando isPlatformAdmin es true', () => {
    expect(guard.canActivate(makeContext({ isPlatformAdmin: true }))).toBe(true);
  });

  it('rechaza a un usuario normal de un ISP, aunque sea SUPER_ADMIN de su cuenta', () => {
    expect(() => guard.canActivate(makeContext({ isPlatformAdmin: false, roles: ['SUPER_ADMIN'] }))).toThrow(ForbiddenException);
  });

  it('rechaza cuando el usuario no trae el flag en absoluto', () => {
    expect(() => guard.canActivate(makeContext({}))).toThrow(ForbiddenException);
  });
});
