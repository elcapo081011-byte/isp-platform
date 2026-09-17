import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRouterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  host: string;

  @IsOptional()
  @IsInt()
  port?: number;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  useTls?: boolean;

  @IsOptional()
  @IsString()
  location?: string;
}
