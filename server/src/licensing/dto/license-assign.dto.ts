import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsDateString,
  Min,
} from 'class-validator';
import { LicenseType } from '@prisma/client'; 

export class LicenseAssignDto {
  @ApiProperty({
    description: 'Lisansın atanacağı organizasyonun UUID değeri.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  orgId: string;

  @ApiProperty({
    enum: LicenseType,
    description: 'Lisans türü (Örn: TRIAL, PREMIUM, ENTERPRISE)',
  })
  @IsEnum(LicenseType)
  @IsNotEmpty()
  type: LicenseType;

  @ApiPropertyOptional({
    description: 'Lisans kapsamında tanımlanan kredi miktarı. Sınırsız olması için boş veya null bırakın.',
    example: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credits?: number | null;

  @ApiPropertyOptional({
    description: 'Lisansın geçerlilik süresinin dolacağı tarih.',
    example: '2027-12-31T23:59:59Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Lisansla ilgili ek notlar veya açıklama.',
    example: 'Özel kampanya kapsamında tanımlandı.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Lisansı tanımlayan admin veya sistem kullanıcısının UUID değeri.',
  })
  @IsUUID()
  @IsNotEmpty()
  issuedById: string;
}