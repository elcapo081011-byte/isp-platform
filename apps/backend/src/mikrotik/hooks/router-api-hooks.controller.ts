import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../rbac/permissions.guard';
import { RouterApiHooksService } from './router-api-hooks.service';
import { CreateApiHookDto, UpdateApiHookDto } from './api-hook.dto';

@ApiTags('mikrotik')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('mikrotik.manage')
@Controller('mikrotik/routers/:routerId/api-hooks')
export class RouterApiHooksController {
  constructor(private hooks: RouterApiHooksService) {}

  @Get()
  list(@Param('routerId') routerId: string, @Req() req: any) {
    return this.hooks.list(routerId, req.user.organizationId);
  }

  @Post()
  create(@Param('routerId') routerId: string, @Body() dto: CreateApiHookDto, @Req() req: any) {
    return this.hooks.create(routerId, req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Put(':hookId')
  update(@Param('routerId') routerId: string, @Param('hookId') hookId: string, @Body() dto: UpdateApiHookDto, @Req() req: any) {
    return this.hooks.update(routerId, hookId, req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Delete(':hookId')
  remove(@Param('routerId') routerId: string, @Param('hookId') hookId: string, @Req() req: any) {
    return this.hooks.remove(routerId, hookId, req.user.organizationId, req.user.sub, req.ip);
  }

  @Post(':hookId/test')
  test(@Param('routerId') routerId: string, @Param('hookId') hookId: string, @Req() req: any) {
    return this.hooks.test(routerId, hookId, req.user.organizationId);
  }
}
