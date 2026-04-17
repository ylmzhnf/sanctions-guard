import { IsString, IsObject, IsOptional, IsNotEmpty } from 'class-validator';

export class AuditEntryDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  orgId: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsObject()
  metadata: Record<string, unknown>;

  @IsString()
  @IsOptional()
  queryId?: string;
}
