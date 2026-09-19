import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';

@Module({
  imports: [MikrotikModule],
  controllers: [CustomersController],
  providers: [CustomersService, PrismaService, AuditService, CredentialsEncryptionService],
})
export class CustomersModule {}
