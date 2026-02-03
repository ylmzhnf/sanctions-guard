import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class SearchSanctionDto {
  @IsString()
  @IsNotEmpty({ message: 'Query name cannot be empty' })
  @MinLength(3, { message: 'Query name must be at least 3 characters long' })
  queryName: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty({ message: 'User ID cannot be empty' })
  @Min(1, { message: 'User ID must be a positive number' })
  userId: number;
}
