import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export enum PlanStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsInt()
  @Min(1)
  downloadMbps: number;

  @IsInt()
  @Min(1)
  uploadMbps: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  technology: string;

  @IsOptional()
  @IsString()
  mikrotikProfile?: string;

  @IsOptional()
  @IsString()
  burstLimit?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsInt()
  vlan?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {
  @IsOptional()
  @IsEnum(PlanStatusDto)
  status?: PlanStatusDto;
}
