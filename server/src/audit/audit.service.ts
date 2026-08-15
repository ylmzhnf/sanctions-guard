import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditEntryDto } from './dto/audit-entry.dto';
import { createHmac, randomUUID } from 'crypto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  
  private readonly hmacSecret =
    process.env.AUDIT_SECRET || 'audit-integrity-salt-secure-key';

  constructor(private readonly prisma: PrismaService) {}

  
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
    const result = sortedKeys.map((key) => {
      return `${JSON.stringify(key)}:${this.canonicalStringify(obj[key])}`;
    });
    return '{' + result.join(',') + '}';
  }

  
  private generateHash(payload: object): string {
    const canonicalPayload = this.canonicalStringify(payload);
    return createHmac('sha256', this.hmacSecret)
      .update(canonicalPayload)
      .digest('hex');
  }

  
  async log(data: AuditEntryDto): Promise<void> {
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const actorId = data.actorId || 'SYSTEM';

    const payloadObject = {
      id,
      action: data.action,
      actorId,
      orgId: data.orgId,
      queryId: data.queryId || null,
      metadata: data.metadata || {},
      createdAt: timestamp,
    };

    const integrityHash = this.generateHash(payloadObject);

    try {
      await this.prisma.auditLog.create({
        data: {
          id,
          action: data.action,
          actorId,
          orgId: data.orgId,
          queryId: data.queryId,
          metadata: data.metadata as Prisma.InputJsonValue,
          integrityHash,
          createdAt: new Date(timestamp),
        },
      });
    } catch (err) {
      
      
      this.logger.error(
        `CRITICAL: Audit log write failed for action ${data.action}`,
        err.stack,
      );
    }
  }

  
  async verifyLog(logId: string): Promise<{ valid: boolean; log: any }> {
    const log = await this.prisma.auditLog.findUniqueOrThrow({
      where: { id: logId },
    });

    const payloadObject = {
      id: log.id,
      action: log.action,
      actorId: log.actorId,
      orgId: log.orgId,
      queryId: log.queryId || null,
      metadata: log.metadata || {},
      createdAt: log.createdAt.toISOString(),
    };

    const expectedHash = this.generateHash(payloadObject);
    const valid = expectedHash === log.integrityHash;

    if (!valid) {
      this.logger.error(`ALERT: Integrity FAILED for audit log ID: ${logId}`);
    }

    return { valid, log };
  }

  
  async getOrgLogs(orgId: string, page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;

    const whereClause: Prisma.AuditLogWhereInput = { orgId };

    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { actorId: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { email: true, name: true } },
          query: { select: { queryName: true, riskLevel: true } },
        },
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  
  async update() {
    throw new ForbiddenException(
      'Audit logs are immutable and cannot be modified.',
    );
  }

  async delete() {
    throw new ForbiddenException(
      'Audit logs are immutable and cannot be deleted.',
    );
  }
}
