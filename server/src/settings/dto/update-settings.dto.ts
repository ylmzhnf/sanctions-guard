import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { AiProvider } from '@prisma/client';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold?: number;

  @IsOptional()
  @IsString()
  aiApiKey?: string;

  @IsOptional()
  @IsEnum(AiProvider)
  aiProvider?: AiProvider;
}
