import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditEntryDto } from './dto/audit-entry.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly hmacSecret =
    process.env.AUDIT_SECRET || 'fallback-audit-secret-key-123';
  constructor(private prisma: PrismaService) {}

  private canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return (
        '[' + obj.map((item) => this.canonicalStringify(item)).join(',') + ']'
      );
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: string[] = [];
    
    for (const key of sortedKeys) {
      result.push(
        `${JSON.stringify(key)}:${this.canonicalStringify(obj[key])}`,
      );
    }
    return '{' + result.join(',') + '}';
  }

  async log(data: AuditEntryDto): Promise<void> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const payloadObject = {
      id,
      action: data.action,
      userId: data.userId || null,
      orgId: data.orgId,
      queryId: data.queryId || null,
      metadata: data.metadata,
      createdAt: timestamp,
    };

    const canonicalPayload = this.canonicalStringify(payloadObject);
    const integrityHash = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(canonicalPayload)
      .digest('hex');

    try {
      await this.prisma.auditLog.create({
        data: {
          id,
          action: data.action,
          userId: data.userId,
          orgId: data.orgId,
          queryId: data.queryId,
          metadata: data.metadata,
          integrityHash,
          createdAt: new Date(timestamp),
        },
      });
    } catch (err) {
      this.logger.error('CRITICAL: Audit log write failed', err);
    }
  }

  async verifyLog(logId: string): Promise<{ valid: boolean; log: any }> {
    const log = await this.prisma.auditLog.findUniqueOrThrow({
      where: { id: logId },
    });

    const payloadObject = {
      id: log.id,
      action: log.action,
      userId: log.userId,
      orgId: log.orgId,
      queryId: log.queryId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    };

    const canonicalPayload = this.canonicalStringify(payloadObject);
    const expectedHash = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(canonicalPayload)
      .digest('hex');

    const valid = expectedHash === log.integrityHash;

    if (!valid) {
      this.logger.error(
        `ALERT: Audit log integrity check FAILED for id=${logId}`,
      );
    }

    return { valid, log };
  }

  async getAuditLogs(orgId: string, page = 1, limit = 50) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { email: true, name: true }, 
          },
          query: {
            select: { searchedName: true, riskLevel: true, status: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where: { orgId } }),
    ]);
    return { logs, total, page, pages: Math.ceil(total / limit) };
  }
  async updateLog() {
    throw new ForbiddenException(
      'CRITICAL: Audit logs are immutable and cannot be updated.',
    );
  }

  async deleteLog() {
    throw new ForbiddenException(
      'CRITICAL: Audit logs are immutable and cannot be deleted.',
    );
  }
}
