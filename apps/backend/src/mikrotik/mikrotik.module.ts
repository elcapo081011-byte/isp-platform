import { Module } from '@nestjs/common';
import { MikrotikController } from './mikrotik.controller';
import { MikrotikService } from './mikrotik.service';
import { RouterOsProvider } from './routeros.provider';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';

@Module({
  controllers: [MikrotikController],
  providers: [MikrotikService, RouterOsProvider, PrismaService, AuditService, CredentialsEncryptionService],
  exports: [MikrotikService],
})
export class MikrotikModule {}
