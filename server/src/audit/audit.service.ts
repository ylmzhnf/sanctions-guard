import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntryDto } from './dto/audit-entry.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async createAuditLog(data: AuditEntryDto) {
    return this.prisma.auditLog.create({
      data: {
        queriedName: data.queriedName,
        matchedName: data.matchedName,
        similarityScore: data.similarityScore,
        user: {
          connect: { id: data.userId },
        },
        ...(data.sanctionId && {
          sanction: {
            connect: { id: data.sanctionId },
          },
        }),
      },
    });
  }
}
