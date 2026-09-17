import { Module, Injectable, Controller, Get, Post, Body, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

enum InventoryStatusDto { IN_STOCK = 'IN_STOCK', INSTALLED = 'INSTALLED', DAMAGED = 'DAMAGED', IN_REPAIR = 'IN_REPAIR', LOST = 'LOST' }

class CreateItemDto {
  @IsString() category: string;
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsString() serial?: string;
  @IsOptional() @IsString() notes?: string;
}

class MoveItemDto {
  @IsEnum(InventoryStatusDto) toStatus: InventoryStatusDto;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() assignedToCustomerId?: string;
}

@Injectable()
class InventoryService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  list(organizationId: string, category?: string, status?: string) {
    return this.prisma.inventoryItem.findMany({
      where: { organizationId, category, status: status as any },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dto: CreateItemDto, userId: string, ip?: string) {
    const item = await this.prisma.inventoryItem.create({ data: { ...dto, organizationId } });
    await this.audit.log({ organizationId, userId, action: 'inventory.create', entityType: 'InventoryItem', entityId: item.id, ipAddress: ip });
    return item;
  }

  async move(organizationId: string, itemId: string, dto: MoveItemDto, userId: string, ip?: string) {
    const before = await this.prisma.inventoryItem.findFirst({ where: { id: itemId, organizationId } });
    if (!before) throw new NotFoundException('Artículo no encontrado');

    const item = await this.prisma.inventoryItem.update({
      where: { id: itemId },
      data: { status: dto.toStatus, assignedToCustomerId: dto.assignedToCustomerId },
    });
    await this.prisma.inventoryMovement.create({
      data: { itemId, fromStatus: before.status, toStatus: dto.toStatus, note: dto.note, userId },
    });
    await this.audit.log({ organizationId, userId, action: 'inventory.move', entityType: 'InventoryItem', entityId: itemId, ipAddress: ip, before, after: item });
    return item;
  }
}

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get()
  @RequirePermissions('inventory.view')
  list(@Req() req: any, @Query('category') category?: string, @Query('status') status?: string) {
    return this.inventory.list(req.user.organizationId, category, status);
  }

  @Post()
  @RequirePermissions('inventory.manage')
  create(@Body() dto: CreateItemDto, @Req() req: any) {
    return this.inventory.create(req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Post(':id/move')
  @RequirePermissions('inventory.manage')
  move(@Param('id') id: string, @Body() dto: MoveItemDto, @Req() req: any) {
    return this.inventory.move(req.user.organizationId, id, dto, req.user.sub, req.ip);
  }
}

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService, AuditService],
})
export class InventoryModule {}
