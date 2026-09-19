import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SuspensionEngineService } from './suspension-engine.service';
import { ZoneBillingEngineService } from './zone-billing-engine.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MikrotikModule } from '../mikrotik/mikrotik.module';

@Module({
  imports: [NotificationsModule, MikrotikModule],
  controllers: [BillingController],
  providers: [BillingService, SuspensionEngineService, ZoneBillingEngineService, PrismaService, AuditService],
})
export class BillingModule {}
