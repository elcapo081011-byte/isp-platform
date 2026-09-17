import { IsOptional, IsString } from 'class-validator';

export class SuspendCustomerDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
