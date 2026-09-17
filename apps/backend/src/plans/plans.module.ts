import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

@Module({
  controllers: [PlansController],
  providers: [PrismaService, AuditService],
})
export class PlansModule {}
