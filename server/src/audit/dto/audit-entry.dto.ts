import { IsString, IsObject, IsOptional } from 'class-validator';

export class AuditEntryDto {
  @IsString()
  userId: string;

  @IsString()
  orgId: string;

  @IsString()
  action: string;

  @IsObject()
  metadata: any;

  @IsString()
  @IsOptional()
  queryId?: string;
}
