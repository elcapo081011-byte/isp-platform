import {
  Module, Injectable, Controller, Get, Post, Delete, Body, Param, Req, UseGuards,
  CanActivate, ExecutionContext, Injectable as Inj, UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsString, MinLength } from 'class-validator';
import { randomBytes, createHash } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

class CreateApiKeyDto {
  @IsString() @MinLength(2) name: string;
  @IsArray() scopes: string[];
}

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Guard para endpoints consumidos por integraciones externas (punto 23).
 * Se usa con `x-api-key` en el header, en vez de JWT de usuario. La key
 * identifica exactamente una organización — `req.organizationId` queda
 * disponible para el resto del request, igual que si viniera de un JWT.
 */
@Inj()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const rawKey = req.headers['x-api-key'];
    if (!rawKey) throw new UnauthorizedException('Falta el header x-api-key');

    const keyHash = hashKey(rawKey);
    const apiKey = await this.prisma.apiKey.findUnique({ where: { keyHash } });
    if (!apiKey || !apiKey.isActive) throw new UnauthorizedException('API key inválida');

    await this.prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
    req.organizationId = apiKey.organizationId;
    req.apiKeyScopes = apiKey.scopes;
    return true;
  }
}

@Injectable()
class ApiKeysService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async list(organizationId: string) {
    return this.prisma.apiKey.findMany({
      where: { organizationId },
      select: { id: true, name: true, keyPrefix: true, scopes: true, isActive: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** La key completa solo se devuelve UNA VEZ, en la respuesta de creación. */
  async create(organizationId: string, dto: CreateApiKeyDto, userId: string, ip?: string) {
    const rawKey = `isp_${randomBytes(24).toString('hex')}`;
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: { organizationId, name: dto.name, scopes: dto.scopes, keyHash, keyPrefix },
    });

    await this.audit.log({ organizationId, userId, action: 'apikey.create', entityType: 'ApiKey', entityId: apiKey.id, ipAddress: ip });

    return { id: apiKey.id, name: apiKey.name, scopes: apiKey.scopes, rawKey };
  }

  async revoke(organizationId: string, id: string, userId: string, ip?: string) {
    const existing = await this.prisma.apiKey.findFirst({ where: { id, organizationId } });
    if (!existing) throw new UnauthorizedException('API key no encontrada en tu cuenta');
    const apiKey = await this.prisma.apiKey.update({ where: { id }, data: { isActive: false } });
    await this.audit.log({ organizationId, userId, action: 'apikey.revoke', entityType: 'ApiKey', entityId: id, ipAddress: ip });
    return apiKey;
  }
}

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api-keys')
class ApiKeysController {
  constructor(private apiKeys: ApiKeysService) {}

  @Get()
  @RequirePermissions('settings.manage')
  list(@Req() req: any) {
    return this.apiKeys.list(req.user.organizationId);
  }

  @Post()
  @RequirePermissions('settings.manage')
  create(@Body() dto: CreateApiKeyDto, @Req() req: any) {
    return this.apiKeys.create(req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('settings.manage')
  revoke(@Param('id') id: string, @Req() req: any) {
    return this.apiKeys.revoke(req.user.organizationId, id, req.user.sub, req.ip);
  }
}

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyGuard, PrismaService, AuditService],
  exports: [ApiKeyGuard],
})
export class ApiKeysModule {}
