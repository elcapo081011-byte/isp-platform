import { IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export enum OltVendorDto {
  HUAWEI = 'HUAWEI',
  ZTE = 'ZTE',
  FIBERHOME = 'FIBERHOME',
  GENERIC_SNMP = 'GENERIC_SNMP',
  MOCK = 'MOCK',
}

export class CreateOltDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(OltVendorDto)
  vendor: OltVendorDto;

  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  host: string;

  @IsOptional()
  @IsString()
  snmpCommunity?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class RegisterOnuDto {
  @IsString()
  oltId: string;

  @IsString()
  ponPort: string;

  @IsString()
  serial: string;

  @IsOptional()
  @IsString()
  mac?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
