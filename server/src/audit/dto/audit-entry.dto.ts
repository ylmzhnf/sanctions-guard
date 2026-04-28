import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsOptional,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class AuditEntryDto {
  @ApiPropertyOptional({
    description: 'İşlemi yapan kullanıcının UUID değeri. Sistem işlemlerinde boş olabilir.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiProperty({
    description: 'İşlemin gerçekleştiği organizasyonun UUID değeri.',
  })
  @IsNotEmpty()
  @IsUUID()
  orgId: string;

  @ApiProperty({
    description: 'Yapılan eylemin adı veya kodu.',
    example: 'USER_LOGIN_SUCCESS',
  })
  @IsNotEmpty()
  @IsString()
  action: string;

  @ApiProperty({
    description: 'İşlemle ilgili ek detaylar ve payload.',
    example: { ipAddress: '192.168.1.1', browser: 'Chrome' },
  })
  @IsNotEmpty()
  @IsObject()
  metadata: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Eğer işlem bir tarama (screening) sorgusuyla ilgiliyse o sorgunun ID değeri.',
  })
  @IsOptional()
  @IsUUID()
  queryId?: string;
}