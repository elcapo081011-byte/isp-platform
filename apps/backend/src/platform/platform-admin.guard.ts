import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Guard exclusivo para el equipo dueño de la plataforma (tú). A diferencia
 * de PermissionsGuard (que siempre queda dentro de la organización del
 * usuario), este guard es la ÚNICA puerta que puede ver/tocar datos de
 * varias organizaciones a la vez — por eso exige el flag `isPlatformAdmin`
 * del JWT, que nunca se asigna desde el signup público (`/auth/register`).
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Este endpoint es solo para el equipo de la plataforma');
    }
    return true;
  }
}
