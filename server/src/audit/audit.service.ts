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

  async getAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return logs.map((log) => {
      let status = 'CLEAR';
      if (log.similarityScore !== null && log.similarityScore !== undefined) {
        if (log.similarityScore >= 95) status = 'CRITICAL';
        else if (log.similarityScore >= 85) status = 'HIGH';
        else if (log.similarityScore >= 70) status = 'MEDIUM';
        else status = 'LOW';
      }
      return {
        ...log,
        status,
      };
    });
  }
}
