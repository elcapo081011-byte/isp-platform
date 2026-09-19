import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;

  /** Nombre del rol: ADMIN, SOPORTE, TECNICO, FACTURACION, MONITORING (o SUPER_ADMIN si quien crea también lo es). */
  @IsString()
  role: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Si viene, reemplaza la contraseña y cierra las sesiones abiertas de ese usuario. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
