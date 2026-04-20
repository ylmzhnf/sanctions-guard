import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntryDto } from './dto/audit-entry.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  private canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return JSON.stringify(obj);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: any = {};
    for (const key of sortedKeys) {
      result[key] = obj[key];
    }
    return JSON.stringify(result);
  }

  async createAuditLog(data: AuditEntryDto) {
    const canonicalMetadata = this.canonicalStringify(data.metadata);
    const secret = process.env.AUDIT_SECRET || 'fallback-secret-key-123';
    
    const integrityHash = crypto
      .createHmac('sha256', secret)
      .update(canonicalMetadata)
      .digest('hex');

    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        metadata: data.metadata,
        integrityHash,
        orgId: data.orgId,
        userId: data.userId,
        queryId: data.queryId,
      },
    });
  }

  async getAuditLogs(orgId: string) {
    return this.prisma.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
        query: true,
      },
    });
  }
}
