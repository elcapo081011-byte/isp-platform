import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { MikrotikService } from './mikrotik.service';
import { CreateRouterDto } from './dto/router.dto';

@ApiTags('mikrotik')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mikrotik/routers')
export class MikrotikController {
  constructor(private mikrotik: MikrotikService) {}

  @Get()
  @RequirePermissions('mikrotik.view')
  list(@Req() req: any) {
    return this.mikrotik.list(req.user.organizationId);
  }

  @Post()
  @RequirePermissions('mikrotik.manage')
  create(@Body() dto: CreateRouterDto, @Req() req: any) {
    return this.mikrotik.create(req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Post(':id/check-connection')
  @RequirePermissions('mikrotik.view')
  checkConnection(@Param('id') id: string, @Req() req: any) {
    return this.mikrotik.checkConnection(id, req.user.organizationId);
  }

  @Get(':id/system-info')
  @RequirePermissions('mikrotik.view')
  systemInfo(@Param('id') id: string, @Req() req: any) {
    return this.mikrotik.getSystemInfo(id, req.user.organizationId);
  }

  @Get(':id/pppoe-sessions')
  @RequirePermissions('mikrotik.view')
  sessions(@Param('id') id: string, @Req() req: any) {
    return this.mikrotik.listActiveSessions(id, req.user.organizationId);
  }
}
