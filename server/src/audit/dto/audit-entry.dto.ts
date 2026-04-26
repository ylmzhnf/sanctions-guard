import {
  IsString,
  IsObject,
  IsOptional,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class AuditEntryDto {
  @IsUUID()
  @IsOptional()
  actorId?: string;
  @IsUUID()
  @IsNotEmpty()
  orgId: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsObject()
  @IsNotEmpty()
  metadata: Record<string, any>;

  @IsUUID()
  @IsOptional()
  queryId?: string | null;
}
