import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuditService],
})
export class UsersModule {}
