import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditParams {
  organizationId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Registro centralizado de auditoría (punto 21). Todo módulo que ejecute
 * una acción sensible (suspender cliente, cambiar plan, editar OLT, etc.)
 * debe llamar a AuditService.log(...).
 */
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditParams) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        before: params.before as any,
        after: params.after as any,
      },
    });
  }
}
