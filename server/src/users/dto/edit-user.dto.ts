import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';

export class EditUserDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Geçersiz e-posta formatı' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Kullanıcının ilk girişte şifre değiştirmesi zorunlu mu?' })
  @IsBoolean()
  @IsOptional()
  mustChangePassword?: boolean;

  @ApiPropertyOptional({ enum: Role, description: 'Kullanıcı yetki seviyesi' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ minLength: 8, description: 'Yeni şifre (belirlenecekse)' })
  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @IsOptional()
  password?: string;
}