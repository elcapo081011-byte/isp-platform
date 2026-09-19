import { Module } from '@nestjs/common';
import { MikrotikController } from './mikrotik.controller';
import { MikrotikService } from './mikrotik.service';
import { RouterOsProvider } from './routeros.provider';
import { RouterApiHooksController } from './hooks/router-api-hooks.controller';
import { RouterApiHooksService } from './hooks/router-api-hooks.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';

@Module({
  controllers: [MikrotikController, RouterApiHooksController],
  providers: [MikrotikService, RouterOsProvider, RouterApiHooksService, PrismaService, AuditService, CredentialsEncryptionService],
  exports: [MikrotikService, RouterApiHooksService],
})
export class MikrotikModule {}
