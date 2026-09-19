import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsArray()
  roleIds!: string[];
}

export class UpdateUserRolesDto {
  @IsArray()
  roleIds!: string[];
}

export class SetUserActiveDto {
  @IsBoolean()
  isActive!: boolean;
}
