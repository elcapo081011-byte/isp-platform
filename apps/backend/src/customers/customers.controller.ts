import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CustomersService } from './customers.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { SuspendCustomerDto } from './dto/suspend-customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService, private mikrotik: MikrotikService) {}

  @Get()
  @RequirePermissions('clients.view')
  async list(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.customersService.list(req.user.organizationId, {
      search,
      status,
      page: parseInt(page, 10) || 1,
      pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
    });
  }

  @Get(':id')
  @RequirePermissions('clients.view')
  async profile(@Param('id') id: string, @Req() req: any) {
    return this.customersService.getProfile(req.user.organizationId, id);
  }

  @Post()
  @RequirePermissions('clients.create')
  async create(@Body() dto: CreateCustomerDto, @Req() req: any) {
    return this.customersService.create(req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Put(':id')
  @RequirePermissions('clients.edit')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Req() req: any) {
    return this.customersService.update(req.user.organizationId, id, dto, req.user.sub, req.ip);
  }

  @Post(':id/suspend')
  @RequirePermissions('clients.edit')
  async suspend(@Param('id') id: string, @Body() dto: SuspendCustomerDto, @Req() req: any) {
    const customer = await this.customersService.suspend(req.user.organizationId, id, dto.reason, req.user.sub, req.ip);

    // Corte real en el router del cliente — SIEMPRE el router de SU propia
    // organización (Service.routerId pertenece a la misma cuenta que Customer).
    const service = await this.customersService.getServiceWithRouter(req.user.organizationId, id);
    let networkResult: { applied: boolean; error?: string } | { applied: false; reason: string } = {
      applied: false,
      reason: 'El servicio no tiene un router MikroTik ni usuario PPPoE asignado',
    };
    if (service?.routerId && service.pppoeUsername) {
      networkResult = await this.mikrotik.disableCustomerSession(service.routerId, service.pppoeUsername);
    }

    return { ...customer, networkAction: networkResult };
  }

  @Post(':id/reactivate')
  @RequirePermissions('clients.edit')
  async reactivate(@Param('id') id: string, @Req() req: any) {
    const customer = await this.customersService.reactivate(req.user.organizationId, id, req.user.sub, req.ip);

    const service = await this.customersService.getServiceWithRouter(req.user.organizationId, id);
    let networkResult: { applied: boolean; error?: string } | { applied: false; reason: string } = {
      applied: false,
      reason: 'El servicio no tiene un router MikroTik ni usuario PPPoE asignado',
    };
    if (service?.routerId && service.pppoeUsername) {
      networkResult = await this.mikrotik.enableCustomerSession(service.routerId, service.pppoeUsername);
    }

    return { ...customer, networkAction: networkResult };
  }

  @Delete(':id')
  @RequirePermissions('clients.delete')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.customersService.remove(req.user.organizationId, id, req.user.sub, req.ip);
  }
}
