import { Body, Controller, Get, Module, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

/** Staff de la organización (equivalente a "Staff / Usuarios" de WispHub). */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('users.manage')
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  private actor(req: any) {
    return { userId: req.user.sub as string, roles: (req.user.roles ?? []) as string[] };
  }

  @Get()
  list(@Req() req: any) {
    return this.users.list(req.user.organizationId);
  }

  @Get('roles')
  roles(@Req() req: any) {
    return this.users.assignableRoles(this.actor(req));
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.users.create(req.user.organizationId, this.actor(req), dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.users.update(req.user.organizationId, this.actor(req), id, dto);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuditService],
  exports: [UsersService],
})
export class UsersModule {}
