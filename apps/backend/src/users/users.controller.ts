import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { UsersService } from './users.service';
import { CreateUserDto, SetUserActiveDto, UpdateUserRolesDto } from './dto/user.dto';

/**
 * Gestión de usuarios DENTRO de tu propia organización (agregar técnicos,
 * otro admin, etc.). El permiso `users.manage` ya existía en el catálogo
 * desde el inicio, pero nunca se había construido el endpoint — por eso
 * antes no había forma de crear un usuario nuevo.
 */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @RequirePermissions('users.manage')
  list(@Req() req: any) {
    return this.users.list(req.user.organizationId);
  }

  @Get('roles')
  @RequirePermissions('users.manage')
  listRoles() {
    return this.users.listRoles();
  }

  @Post()
  @RequirePermissions('users.manage')
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.users.create(req.user.organizationId, dto, req.user.sub);
  }

  @Patch(':id/active')
  @RequirePermissions('users.manage')
  setActive(@Param('id') id: string, @Body() dto: SetUserActiveDto, @Req() req: any) {
    return this.users.setActive(req.user.organizationId, id, dto.isActive, req.user.sub);
  }

  @Patch(':id/roles')
  @RequirePermissions('users.manage')
  updateRoles(@Param('id') id: string, @Body() dto: UpdateUserRolesDto, @Req() req: any) {
    return this.users.updateRoles(req.user.organizationId, id, dto.roleIds, req.user.sub);
  }
}
