import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export enum CustomerStatusDto {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISCONNECTED = 'DISCONNECTED',
  PENDING_INSTALLATION = 'PENDING_INSTALLATION',
}

export enum PaymentMethodDto {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  OTHER = 'OTHER',
}

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsEnum(PaymentMethodDto)
  paymentMethod?: PaymentMethodDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  billingDay?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // Alta de servicio inicial (opcional al crear el cliente)
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  pppoeUsername?: string;

  /** Clave del usuario PPPoE. Se guarda cifrada y se envía al router del cliente. */
  @IsOptional()
  @IsString()
  @MinLength(4)
  pppoePassword?: string;

  /** Router/zona MikroTik donde vive el servicio del cliente (debe ser de tu cuenta). */
  @IsOptional()
  @IsString()
  routerId?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto;
}

/** Cambio de plan, router o usuario PPPoE del servicio de un cliente (o alta del servicio si no tenía). */
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  planId?: string;

  /** Cadena vacía = quitar el router. */
  @IsOptional()
  @IsString()
  routerId?: string;

  @IsOptional()
  @IsString()
  pppoeUsername?: string;

  /** Si se omite, se usa la que ya está guardada (cifrada). */
  @IsOptional()
  @IsString()
  @MinLength(4)
  pppoePassword?: string;
}
