import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const email = `e2e.auth.${Date.now()}@example.com`;
  const password = 'TestPass123!';

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('register → login → me returns authenticated user', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        name: 'E2E Auth User',
        orgName: 'E2E Auth Org',
      })
      .expect(201);

    expect(registerRes.body.token).toBeDefined();
    expect(registerRes.body.user.email).toBe(email);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(loginRes.body.token).toBeDefined();

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .expect(200);

    expect(meRes.body.email).toBe(email);
    expect(meRes.body.orgId || meRes.body.organization?.id).toBeDefined();
  });

  it('rejects invalid credentials and unauthenticated /me', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!' })
      .expect(401);

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('demo-login provisions a fresh, isolated workspace every time', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .expect(200);
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-login')
      .expect(200);

    expect(first.body.user.isDemo).toBe(true);
    expect(second.body.user.isDemo).toBe(true);

    // Every visitor gets their OWN user and organization.
    expect(first.body.user.id).not.toBe(second.body.user.id);
    expect(first.body.user.organization.id).not.toBe(
      second.body.user.organization.id,
    );

    // The fresh workspace starts with no screening history.
    const historyRes = await request(app.getHttpServer())
      .get('/api/v1/screening/history')
      .set('Authorization', `Bearer ${first.body.token}`)
      .expect(200);

    expect(historyRes.body.total).toBe(0);
    expect(historyRes.body.queries).toEqual([]);
  });
});
