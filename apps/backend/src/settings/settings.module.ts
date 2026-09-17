import { Module, Injectable, Controller, Get, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';

class UpdateSettingDto {
  @IsObject()
  value: Record<string, unknown>;
}

const KNOWN_KEYS = [
  'company',       // { name, logoUrl, faviconUrl, primaryColor, secondaryColor, currency, timezone }
  'invoice_format',// { prefix, nextNumber }
  'suspension_rules', // { graceDays, notifyDaysBeforeDue }
  'optical_thresholds', // { rxWarnDbm, rxCriticalDbm } — configurable, no universal (punto 10)
  'backup_settings', // { frequency, retentionDays }
];

/** Cada organización tiene su propio conjunto de settings (branding, reglas, thresholds). */
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(organizationId: string) {
    const rows = await this.prisma.setting.findMany({ where: { organizationId } });
    const result: Record<string, unknown> = {};
    for (const key of KNOWN_KEYS) {
      const row = rows.find((r) => r.key === key);
      result[key] = row?.value ?? null;
    }
    return result;
  }

  async get(organizationId: string, key: string) {
    const row = await this.prisma.setting.findUnique({ where: { organizationId_key: { organizationId, key } } });
    return row?.value ?? null;
  }

  async set(organizationId: string, key: string, value: Record<string, unknown>) {
    // Prisma exige que un campo Json reciba su tipo InputJsonValue, no un
    // Record<string, unknown> genérico — se castea explícitamente aquí.
    const jsonValue = value as Prisma.InputJsonValue;
    return this.prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key } },
      update: { value: jsonValue },
      create: { organizationId, key, value: jsonValue },
    });
  }
}

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  @RequirePermissions('settings.manage')
  getAll(@Req() req: any) {
    return this.settings.getAll(req.user.organizationId);
  }

  @Get(':key')
  @RequirePermissions('settings.manage')
  get(@Param('key') key: string, @Req() req: any) {
    return this.settings.get(req.user.organizationId, key);
  }

  @Put(':key')
  @RequirePermissions('settings.manage')
  set(@Param('key') key: string, @Body() dto: UpdateSettingDto, @Req() req: any) {
    return this.settings.set(req.user.organizationId, key, dto.value);
  }
}

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, PrismaService],
  exports: [SettingsService],
})
export class SettingsModule {}
