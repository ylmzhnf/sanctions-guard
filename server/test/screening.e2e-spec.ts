import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Screening (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const email = `e2e.screen.${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const fixtureName = 'E2E Sanction Target';

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

    await prisma.sanctionedEntity.create({
      data: {
        externalId: `E2E-SCREEN-${Date.now()}`,
        name: fixtureName,
        aliases: ['E2E Target Alias'],
        entityType: 'INDIVIDUAL',
        listSource: 'OTHER',
        isActive: true,
      },
    });

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        name: 'E2E Screener',
        orgName: 'E2E Screen Org',
      })
      .expect(201);

    token = registerRes.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('authenticated screen → history contains the query', async () => {
    const screenRes = await request(app.getHttpServer())
      .post('/api/v1/screening/screen')
      .set('Authorization', `Bearer ${token}`)
      .send({ queryName: fixtureName });

    expect([200, 201]).toContain(screenRes.status);
    expect(screenRes.body.success).toBe(true);
    expect(screenRes.body.queryId).toBeDefined();
    expect(screenRes.body.riskLevel).toBeDefined();
    expect(Array.isArray(screenRes.body.data)).toBe(true);

    const historyRes = await request(app.getHttpServer())
      .get('/api/v1/screening/history')
      .set('Authorization', `Bearer ${token}`)
      .query({ limit: 5 })
      .expect(200);

    const queries = historyRes.body.queries || [];
    expect(
      queries.some(
        (q: { queryName: string; id: string }) =>
          q.queryName === fixtureName || q.id === screenRes.body.queryId,
      ),
    ).toBe(true);
  });

  it('rejects unauthenticated screening', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/screening/screen')
      .send({ queryName: fixtureName })
      .expect(401);
  });
});
