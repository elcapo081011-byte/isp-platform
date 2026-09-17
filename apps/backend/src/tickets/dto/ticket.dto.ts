import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum TicketCategoryDto {
  SIN_INTERNET = 'SIN_INTERNET',
  LENTITUD = 'LENTITUD',
  WIFI = 'WIFI',
  ONU_OFFLINE = 'ONU_OFFLINE',
  SEÑAL = 'SEÑAL',
  PAGO = 'PAGO',
  OTRO = 'OTRO',
}

export enum TicketPriorityDto { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH', URGENT = 'URGENT' }
export enum TicketStatusDto {
  OPEN = 'OPEN', IN_PROGRESS = 'IN_PROGRESS', WAITING_CUSTOMER = 'WAITING_CUSTOMER', RESOLVED = 'RESOLVED', CLOSED = 'CLOSED',
}

export class CreateTicketDto {
  @IsString() customerId: string;
  @IsString() @MinLength(3) subject: string;
  @IsEnum(TicketCategoryDto) category: TicketCategoryDto;
  @IsOptional() @IsEnum(TicketPriorityDto) priority?: TicketPriorityDto;
  @IsOptional() @IsString() assignedToId?: string;
}

export class AddCommentDto {
  @IsString() @MinLength(1) body: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatusDto) status: TicketStatusDto;
}
