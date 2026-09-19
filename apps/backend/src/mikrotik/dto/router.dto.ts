import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';

/** IPv4, IPv6 o nombre de host/DDNS. Sin espacios ni símbolos raros. */
const HOST_REGEX = /^[A-Za-z0-9.:_-]{1,253}$/;

export class ZoneBillingDto {
  @IsOptional() @IsIn(['POSTPAID']) billingType?: 'POSTPAID';

  @IsOptional() @IsBoolean() autoInvoices?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(31) invoiceDay?: number;
  @IsOptional() @IsInt() @Min(0) @Max(23) invoiceHour?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) payDay?: number;

  @IsOptional() @IsBoolean() autoReminders?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(31) reminderDay?: number;
  @IsOptional() @IsInt() @Min(0) @Max(23) reminderHour?: number;

  @IsOptional() @IsBoolean() autoCut?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(31) cutDay?: number;
  @IsOptional() @IsInt() @Min(0) @Max(23) cutHour?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) suspendAfterInvoices?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100) taxPercent?: number;

  @IsOptional() @IsBoolean() emailOnInvoice?: boolean;
  @IsOptional() @IsBoolean() emailOnCut?: boolean;
}

export class CreateRouterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  /** IPv4 / IPv6 / DDNS del router. */
  @IsString()
  @Matches(HOST_REGEX, { message: 'El host solo puede tener letras, números, punto, guion y dos puntos' })
  host: string;

  /** IP o DDNS alterna: se usa si el host principal no responde. Vacío = sin failover. */
  @ValidateIf((o) => !!o.failoverHost)
  @IsString()
  @Matches(HOST_REGEX, { message: 'El failover solo puede tener letras, números, punto, guion y dos puntos' })
  failoverHost?: string;

  /**
   * true (por defecto): el sistema genera el usuario/clave de API y los entrega
   * en el "Script de conexión". false: el ISP escribe usuario y clave de un
   * usuario que ya tenga en su MikroTik.
   */
  @IsOptional()
  @IsBoolean()
  useConnectionScript?: boolean;

  @ValidateIf((o) => o.useConnectionScript === false)
  @IsString()
  @MinLength(1)
  username?: string;

  @ValidateIf((o) => o.useConnectionScript === false)
  @IsString()
  @MinLength(1)
  password?: string;

  /** Puerto de la API de RouterOS (8728, o 8729 con API-SSL). */
  @IsOptional() @IsInt() @Min(1) @Max(65535) port?: number;
  @IsOptional() @IsInt() @Min(1) @Max(65535) wwwPort?: number;
  @IsOptional() @IsBoolean() useTls?: boolean;

  @IsOptional() @IsString() @MaxLength(60) lanInterface?: string;
  @IsOptional() @IsString() @MaxLength(2000) ipRanges?: string;
  @IsOptional() @IsString() @MaxLength(1000) comments?: string;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsIn(['6', '7']) routerOsVersion?: '6' | '7';
  @IsOptional() @IsString() @MaxLength(80) externalId?: string;

  @IsOptional() @IsBoolean() addClientsToRouter?: boolean;
  @IsOptional() @IsIn(['PPPOE_SECRET', 'ADDRESS_LIST']) cutMode?: 'PPPOE_SECRET' | 'ADDRESS_LIST';

  /** Pestaña "Facturación - Zona". Si se omite, el router usa las reglas globales de la cuenta. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ZoneBillingDto)
  zone?: ZoneBillingDto;
}

/**
 * Al editar, la clave es opcional (vacía = se conserva). `useConnectionScript`
 * no se cambia aquí: para rotar credenciales generadas hay un endpoint aparte.
 */
export class UpdateRouterDto extends PartialType(OmitType(CreateRouterDto, ['useConnectionScript', 'username', 'password'] as const)) {
  @IsOptional()
  @IsString()
  @MinLength(1)
  username?: string;

  /** Vacía = se conserva la contraseña actual. */
  @IsOptional()
  @IsString()
  password?: string;
}
