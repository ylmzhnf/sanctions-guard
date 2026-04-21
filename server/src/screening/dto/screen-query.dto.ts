import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class ScreenQueryDto {
  @IsString({ message: 'queryName must be a string' })
  @MinLength(2, { message: 'queryName must be at least 2 characters long' })
  @MaxLength(100, {
    message: 'queryName is too long. Maximum length is 100 characters',
  })
  queryName: string;

  @IsOptional()
  @IsEnum(['INDIVIDUAL', 'ENTITY', 'VESSEL', 'AIRCRAFT'], {
    message: 'Invalid entity type.',
  })
  entityType?: 'INDIVIDUAL' | 'ENTITY' | 'VESSEL' | 'AIRCRAFT';

  @IsString()
  @IsOptional()
  country?: string;
}
