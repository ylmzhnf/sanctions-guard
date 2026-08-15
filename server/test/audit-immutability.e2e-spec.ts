import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Audit Immutability (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let audit: AuditService;
  let actorId: string;
  let orgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    audit = app.get(AuditService);

    const sqlPath = join(
      __dirname,
      '../prisma/sql/audit_immutability_trigger.sql',
    );
    const sql = readFileSync(sqlPath, 'utf8');
    await prisma.$executeRawUnsafe(sql);

    const email = `e2e.audit.${Date.now()}@example.com`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'TestPass123!',
        name: 'E2E Audit User',
        orgName: 'E2E Audit Org',
      })
      .expect(201);

    actorId = res.body.user.id;
    orgId = res.body.user.organization.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates integrity-verified audit log on register', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorId, action: 'USER_REGISTERED' },
      orderBy: { createdAt: 'desc' },
    });

    expect(log).toBeTruthy();
    expect(log!.integrityHash).toBeTruthy();
    expect(log!.orgId).toBe(orgId);

    const { valid } = await audit.verifyLog(log!.id);
    expect(valid).toBe(true);
  });

  it('DB trigger blocks UPDATE and DELETE on AuditLog', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { actorId, action: 'USER_REGISTERED' },
    });
    expect(log).toBeTruthy();

    await expect(
      prisma.$executeRaw`
        UPDATE "AuditLog" SET action = 'TAMPERED' WHERE id = ${log!.id}
      `,
    ).rejects.toThrow(/immutable/i);

    await expect(
      prisma.$executeRaw`
        DELETE FROM "AuditLog" WHERE id = ${log!.id}
      `,
    ).rejects.toThrow(/immutable/i);

    const stillThere = await prisma.auditLog.findUnique({
      where: { id: log!.id },
    });
    expect(stillThere?.action).toBe('USER_REGISTERED');
  });
});
