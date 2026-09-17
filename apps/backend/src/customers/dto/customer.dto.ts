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
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto;
}
