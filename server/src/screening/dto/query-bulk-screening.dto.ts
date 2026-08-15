import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const ENTITY_TYPES = ['INDIVIDUAL', 'ENTITY', 'VESSEL', 'AIRCRAFT'] as const;

export class ScreenQueryDto {
  @ApiProperty({
    description: 'The name of the entity or individual to screen',
    example: 'Viktor Bout',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'Query name must be a valid string.' })
  @MinLength(2, { message: 'Query name must be at least 2 characters long.' })
  @MaxLength(100, { message: 'Query name cannot exceed 100 characters.' })
  queryName: string;

  @ApiPropertyOptional({
    description: 'Filter by a specific entity type to narrow down results',
    enum: ENTITY_TYPES,
    example: 'INDIVIDUAL',
  })
  @IsOptional()
  @IsEnum(ENTITY_TYPES, {
    message: `Invalid entity type. Allowed values: ${ENTITY_TYPES.join(', ')}`,
  })
  entityType?: (typeof ENTITY_TYPES)[number];

  @ApiPropertyOptional({
    description: 'ISO Alpha-2 or Alpha-3 country code',
    example: 'RU',
  })
  @Transform(({ value }) => value?.trim().toUpperCase())
  @IsString()
  @IsOptional()
  country?: string;
}

export class BulkScreenDto {
  @ApiProperty({
    description: 'Array of names to screen in a single batch job',
    example: ['Viktor Bout', 'Osama bin Laden', 'Aeroflot'],
    maxItems: 1000,
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Names array cannot be empty.' })
  @ArrayMaxSize(1000, {
    message: 'You can only screen up to 1000 names per batch request.',
  })
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((name) => (typeof name === 'string' ? name.trim() : name))
      : value,
  )
  names: string[];

  @ApiPropertyOptional({
    description: 'Filter all batch results by a specific entity type',
    enum: ENTITY_TYPES,
  })
  @IsOptional()
  @IsEnum(ENTITY_TYPES, {
    message: `Invalid entity type. Allowed values: ${ENTITY_TYPES.join(', ')}`,
  })
  entityType?: (typeof ENTITY_TYPES)[number];

  @ApiPropertyOptional({ description: 'Filter all batch results by country' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  @IsOptional()
  @IsString()
  country?: string;
}
