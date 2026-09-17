import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { OltService } from './olt.service';
import { CreateOltDto, RegisterOnuDto } from './dto/olt.dto';

@ApiTags('olt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('olt')
export class OltController {
  constructor(private olt: OltService) {}

  @Get()
  @RequirePermissions('olt.view')
  list(@Req() req: any) {
    return this.olt.list(req.user.organizationId);
  }

  @Post()
  @RequirePermissions('olt.manage')
  create(@Body() dto: CreateOltDto, @Req() req: any) {
    return this.olt.create(req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Post(':id/check-connection')
  @RequirePermissions('olt.view')
  checkConnection(@Param('id') id: string, @Req() req: any) {
    return this.olt.checkConnection(req.user.organizationId, id);
  }

  @Get(':id/pon-ports')
  @RequirePermissions('olt.view')
  ponPorts(@Param('id') id: string, @Req() req: any) {
    return this.olt.listPonPorts(req.user.organizationId, id);
  }

  @Get(':id/onus')
  @RequirePermissions('onu.view')
  onus(@Param('id') id: string, @Req() req: any) {
    return this.olt.listOnusByOlt(req.user.organizationId, id);
  }

  @Post('onus')
  @RequirePermissions('onu.manage')
  registerOnu(@Body() dto: RegisterOnuDto, @Req() req: any) {
    return this.olt.registerOnu(req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Post('onus/:id/authorize')
  @RequirePermissions('onu.manage')
  authorize(@Param('id') id: string, @Req() req: any) {
    return this.olt.authorizeOnu(req.user.organizationId, id, req.user.sub, req.ip);
  }

  @Post('onus/:id/deauthorize')
  @RequirePermissions('onu.manage')
  deauthorize(@Param('id') id: string, @Req() req: any) {
    return this.olt.deauthorizeOnu(req.user.organizationId, id, req.user.sub, req.ip);
  }
}
