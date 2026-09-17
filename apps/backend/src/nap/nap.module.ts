import { Module, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

class CreateNapDto {
  @IsString() @MinLength(1) name: string;
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;
  @IsOptional() @IsString() splitterRatio?: string;
  @IsOptional() @IsString() oltId?: string;
  @IsOptional() @IsString() ponPort?: string;
}

@ApiTags('nap')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('nap')
class NapController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get()
  @RequirePermissions('onu.view')
  list(@Req() req: any) {
    return this.prisma.nap.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { name: 'asc' } });
  }

  @Post()
  @RequirePermissions('onu.manage')
  async create(@Body() dto: CreateNapDto, @Req() req: any) {
    const nap = await this.prisma.nap.create({ data: { ...dto, organizationId: req.user.organizationId } });
    await this.audit.log({ organizationId: req.user.organizationId, userId: req.user.sub, action: 'nap.create', entityType: 'Nap', entityId: nap.id, ipAddress: req.ip });
    return nap;
  }
}

@Module({
  controllers: [NapController],
  providers: [PrismaService, AuditService],
})
export class NapModule {}
