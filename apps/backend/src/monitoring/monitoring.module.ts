import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { MonitoringService } from './monitoring.service';
import { NocGateway } from './noc.gateway';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { OltModule } from '../olt/olt.module';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('monitoring')
class MonitoringController {
  constructor(private prisma: PrismaService) {}

  @Get('alerts')
  @RequirePermissions('mikrotik.view')
  alerts(@Req() req: any, @Query('status') status?: string) {
    return this.prisma.alert.findMany({
      where: { organizationId: req.user.organizationId, status: status as any },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post('alerts/:id/acknowledge')
  @RequirePermissions('mikrotik.view')
  async acknowledge(@Param('id') id: string, @Req() req: any) {
    await this.prisma.alert.findFirstOrThrow({ where: { id, organizationId: req.user.organizationId } });
    return this.prisma.alert.update({ where: { id }, data: { status: 'ACKNOWLEDGED' } });
  }

  @Post('alerts/:id/resolve')
  @RequirePermissions('mikrotik.view')
  async resolve(@Param('id') id: string, @Req() req: any) {
    await this.prisma.alert.findFirstOrThrow({ where: { id, organizationId: req.user.organizationId } });
    return this.prisma.alert.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
  }

  @Get('events')
  @RequirePermissions('mikrotik.view')
  events(@Req() req: any) {
    return this.prisma.networkEvent.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}

@Module({
  imports: [MikrotikModule, OltModule, JwtModule.register({ secret: process.env.JWT_SECRET })],
  controllers: [MonitoringController],
  providers: [MonitoringService, NocGateway, PrismaService],
})
export class MonitoringModule {}
