import { IsNumber, IsString } from 'class-validator';

export class AuditEntryDto {
  @IsNumber()
  userId: number;

  @IsString()
  queriedName: string;

  @IsString()
  matchedName?: string;

  @IsNumber()
  similarityScore?: number;

  @IsNumber()
  sanctionId?: number;
}
