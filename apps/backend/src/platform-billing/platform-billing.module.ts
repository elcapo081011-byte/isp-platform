import { Body, Controller, Get, Module, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformBillingService } from './platform-billing.service';

class MarkPaidDto {
  @ApiProperty({ example: 'manual_transfer', description: 'Cómo se recibió el pago (transferencia, efectivo, etc.) hasta que haya un gateway conectado.' })
  @IsString()
  method!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Vista del dueño de cada ISP sobre SU PROPIA suscripción a la plataforma:
 * cuántos clientes lleva, cuánto le toca pagar, y sus facturas. No requiere
 * ser platform admin — cualquier usuario autenticado ve los datos de su
 * propia organización, igual que el resto del sistema (scoping por JWT).
 */
@ApiTags('subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing/subscription')
export class SubscriptionController {
  constructor(private platformBilling: PlatformBillingService) {}

  @Get()
  getUsage(@Req() req: any) {
    return this.platformBilling.getUsage(req.user.organizationId);
  }

  @Get('invoices')
  listInvoices(@Req() req: any) {
    return this.platformBilling.listInvoicesForOrg(req.user.organizationId);
  }
}

/**
 * Panel del dueño de la PLATAFORMA (tú) para cobrar a los ISP. Complementa
 * a PlatformController (platform/platform.module.ts), que ya lista
 * organizaciones y permite suspender/activar a mano.
 */
@ApiTags('platform-billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform/billing')
export class PlatformBillingController {
  constructor(private platformBilling: PlatformBillingService) {}

  @Get('invoices')
  listAll(@Query('status') status?: string) {
    return this.platformBilling.listAllInvoices(status);
  }

  @Get('organizations/:id/invoices')
  listForOrg(@Param('id') id: string) {
    return this.platformBilling.listInvoicesForOrg(id);
  }

  @Get('organizations/:id/usage')
  usageForOrg(@Param('id') id: string) {
    return this.platformBilling.getUsage(id);
  }

  @Post('invoices/:id/mark-paid')
  markPaid(@Param('id') id: string, @Body() dto: MarkPaidDto, @Req() req: any) {
    return this.platformBilling.markInvoicePaid(id, req.user.sub, dto.method, dto.notes);
  }

  // Disparo manual del ciclo mensual — útil para pruebas y para el primer
  // mes de una organización que ya venía con clientes antes de esta fase.
  @Post('generate-now')
  generateNow() {
    return this.platformBilling.generateMonthlyInvoices();
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [SubscriptionController, PlatformBillingController],
  providers: [PlatformBillingService, PlatformAdminGuard, PrismaService, AuditService],
})
export class PlatformBillingModule {}
