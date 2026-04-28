import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ description: 'AI analiz eşiği (0-100)', example: 85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold?: number;

  @ApiPropertyOptional({ description: 'OpenAI veya Anthropic API Key' })
  @IsOptional()
  @IsString()
  aiApiKey?: string;

  @ApiPropertyOptional({ description: 'SerpApi API Key' })
  @IsOptional()
  @IsString()
  osintApiKey?: string;

  @ApiPropertyOptional({ enum: AiProvider, description: 'Kullanılacak AI sağlayıcısı' })
  @IsOptional()
  @IsEnum(AiProvider)
  aiProvider?: AiProvider;
}