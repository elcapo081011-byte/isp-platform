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

export class UpdateRouterDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  port?: number;

  @IsOptional()
  @IsString()
  username?: string;

  // Si no se envía, se deja la contraseña actual (no se vuelve a pedir cada vez que se edita).
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  useTls?: boolean;

  @IsOptional()
  @IsString()
  location?: string;
}
