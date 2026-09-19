import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const HOOK_EVENTS = [
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'customer.suspended',
  'customer.activated',
] as const;
export type HookEvent = (typeof HOOK_EVENTS)[number];

export class CreateApiHookDto {
  /** Nombre visible: "Mi CRM", "Sistema de contabilidad"… */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  platform: string;

  /** https:// pública. La validación de destino la hace el servicio. */
  @IsString()
  @MaxLength(500)
  url: string;

  /** Opcional: con esto cada envío lleva la firma X-ISP-Signature (HMAC-SHA256). */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  secret?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(HOOK_EVENTS as unknown as string[], { each: true })
  events: HookEvent[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateApiHookDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) platform?: string;
  @IsOptional() @IsString() @MaxLength(500) url?: string;

  /** Si viene, reemplaza el secreto. */
  @IsOptional() @IsString() @MinLength(8) @MaxLength(200) secret?: string;
  /** true = borrar el secreto (los envíos dejan de llevar firma). */
  @IsOptional() @IsBoolean() clearSecret?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(HOOK_EVENTS as unknown as string[], { each: true })
  events?: HookEvent[];

  @IsOptional() @IsBoolean() enabled?: boolean;
}
