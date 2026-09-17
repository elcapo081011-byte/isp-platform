import { Module } from '@nestjs/common';
import { OltController } from './olt.controller';
import { OltService } from './olt.service';
import { GenericSnmpOltProvider } from './generic-snmp-olt.provider';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

@Module({
  controllers: [OltController],
  providers: [OltService, GenericSnmpOltProvider, PrismaService, AuditService],
})
export class OltModule {}
