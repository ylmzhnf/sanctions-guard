import { IsArray, IsString, ArrayNotEmpty, IsOptional } from 'class-validator';

export class BulkScreenDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  names: string[];

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
