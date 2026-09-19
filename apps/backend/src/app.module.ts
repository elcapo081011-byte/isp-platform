import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomersModule } from './customers/customers.module';
import { PlansModule } from './plans/plans.module';
import { BillingModule } from './billing/billing.module';
import { MikrotikModule } from './mikrotik/mikrotik.module';
import { OltModule } from './olt/olt.module';
import { NapModule } from './nap/nap.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { TicketsModule } from './tickets/tickets.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { BackupsModule } from './backups/backups.module';
import { PlatformModule } from './platform/platform.module';
import { PlatformBillingModule } from './platform-billing/platform-billing.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    DashboardModule,
    CustomersModule,
    PlansModule,
    BillingModule,
    MikrotikModule,
    OltModule,
    NapModule,
    MonitoringModule,
    TicketsModule,
    InventoryModule,
    NotificationsModule,
    SettingsModule,
    ApiKeysModule,
    BackupsModule,
    PlatformModule,
    PlatformBillingModule,
    UsersModule,
  ],
})
export class AppModule {}
