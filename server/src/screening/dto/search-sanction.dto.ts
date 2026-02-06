import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SearchSanctionDto {
  @IsString()
  @IsNotEmpty({ message: 'Query name cannot be empty' })
  @MinLength(3, { message: 'Query name must be at least 3 characters long' })
  queryName: string;
}
