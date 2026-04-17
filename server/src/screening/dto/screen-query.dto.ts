import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class ScreenQueryDto {
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, {
    message: 'Name is too long. Maximum length is 100 characters',
  })
  name: string;

  @IsOptional()
  @IsEnum(['INDIVIDUAL', 'ENTITY', 'VESSEL', 'AIRCRAFT'], {
    message: 'Invalid entity type.',
  })
  entityType?: 'INDIVIDUAL' | 'ENTITY' | 'VESSEL' | 'AIRCRAFT';

  @IsString()
  @IsOptional()
  country?: string;
}
