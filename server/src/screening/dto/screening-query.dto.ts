import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EntityType {
  INDIVIDUAL = 'INDIVIDUAL',
  ENTITY = 'ENTITY',
  VESSEL = 'VESSEL',
  AIRCRAFT = 'AIRCRAFT',
}

/**
 * Screening Query DTO
 * Secure, validated input for single entity screening
 * - Minimal 2 chars, max 100 chars (prevents DoS)
 * - Whitespace normalized
 * - Entity type constrained to enum
 * - Optional country code validation
 */
export class ScreeningQueryDto {
  @ApiProperty({
    description: 'The name of the entity or individual to screen',
    example: 'Viktor Bout',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string')
      throw new Error('Query name must be a string');
    return value.trim().replace(/\s+/g, ' '); // Normalize whitespace
  })
  @IsString()
  @MinLength(2, { message: 'Query name must be at least 2 characters long.' })
  @MaxLength(100, { message: 'Query name cannot exceed 100 characters.' })
  @Matches(/^[a-zA-Z0-9\s\-\.\,]+$/, {
    message:
      'Query name contains invalid characters. Only alphanumeric, spaces, hyphens, periods, and commas allowed.',
  })
  queryName: string;

  @ApiPropertyOptional({
    description: 'Filter by entity type (INDIVIDUAL, ENTITY, VESSEL, AIRCRAFT)',
    enum: EntityType,
    example: 'INDIVIDUAL',
  })
  @IsOptional()
  @IsEnum(EntityType, {
    message: `Invalid entity type. Allowed: ${Object.values(EntityType).join(', ')}`,
  })
  entityType?: EntityType;

  @ApiPropertyOptional({
    description: 'Optional: ISO Alpha-2 or Alpha-3 country code filter',
    example: 'RU',
    minLength: 2,
    maxLength: 3,
  })
  @IsOptional()
  @Transform(({ value }) => value?.trim().toUpperCase())
  @Matches(/^[A-Z]{2,3}$/, {
    message:
      'Country must be a valid ISO Alpha-2 or Alpha-3 code (e.g., RU, USA).',
  })
  country?: string;
}

/**
 * Bulk Screening DTO
 * - Maximum 100 names per batch to prevent abuse
 * - Each name validated individually
 * - Designed for queue-based async processing
 */
export class BulkScreeningDto {
  @ApiProperty({
    description: 'Array of entity names to screen in bulk',
    type: [String],
    example: ['Viktor Bout', 'Roman Abramovich'],
    minItems: 1,
    maxItems: 100,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) throw new Error('Names must be an array');
    if (value.length === 0) throw new Error('At least one name is required');
    if (value.length > 100)
      throw new Error('Maximum 100 names per bulk request');
    return value.map((name) => {
      if (typeof name !== 'string')
        throw new Error('Each name must be a string');
      return name.trim();
    });
  })
  names: string[];
}
