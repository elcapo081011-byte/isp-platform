import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function makeContext(userPermissions: string[]): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { permissions: userPermissions } }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('permite el acceso cuando el handler no requiere permisos', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(makeContext([]))).toBe(true);
  });

  it('permite el acceso cuando el usuario tiene todos los permisos requeridos', () => {
    const reflector = { getAllAndOverride: () => ['clients.view'] } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(makeContext(['clients.view', 'billing.view']))).toBe(true);
  });

  it('rechaza el acceso cuando falta un permiso requerido', () => {
    const reflector = { getAllAndOverride: () => ['clients.delete'] } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(makeContext(['clients.view']))).toThrow(ForbiddenException);
  });
});
