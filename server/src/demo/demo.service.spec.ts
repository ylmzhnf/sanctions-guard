import { Test, TestingModule } from '@nestjs/testing';
import { AiProvider, ListSource, Role } from '@prisma/client';

import { DemoService } from './demo.service';
import { PrismaService } from '../common/prisma/prisma.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-random-password'),
}));

describe('DemoService', () => {
  let service: DemoService;

  const mockTx = {
    organization: { create: jest.fn() },
    user: { create: jest.fn() },
  };

  const mockPrisma = {
    $transaction: jest.fn(
      (cb: (tx: typeof mockTx) => Promise<{ user: object; org: object }>) =>
        cb(mockTx),
    ),
    organization: { deleteMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.DEMO_AI_PROVIDER;
    delete process.env.DEMO_SESSION_TTL_HOURS;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DemoService>(DemoService);
  });

  describe('provisionSession', () => {
    it('creates an isolated demo org and user inside a transaction', async () => {
      const org = { id: 'demo-org-abc', name: 'Demo Workspace', isDemo: true };
      const user = {
        id: 'demo-user-abc',
        email: 'demo-abc@demo.sanctions-guard.local',
        name: 'Demo Analyst',
        role: Role.ADMIN,
        isActive: true,
        isDemo: true,
        orgId: 'demo-org-abc',
        organization: org,
      };

      mockTx.organization.create.mockResolvedValue(org);
      mockTx.user.create.mockResolvedValue(user);

      const result = await service.provisionSession();

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: expect.stringMatching(/^demo-org-/),
            name: 'Demo Workspace',
            isDemo: true,
            settings: {
              create: expect.objectContaining({
                aiProvider: AiProvider.OPENAI,
                aiThreshold: 50,
                activeListSources: [
                  ListSource.OFAC,
                  ListSource.EU,
                  ListSource.UN,
                  ListSource.UK_HMT,
                ],
              }),
            },
          }),
        }),
      );

      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: expect.stringMatching(/^demo-user-/),
            email: expect.stringMatching(
              /^demo-.+@demo\.sanctions-guard\.local$/,
            ),
            name: 'Demo Analyst',
            role: Role.ADMIN,
            isActive: true,
            isDemo: true,
            passwordHash: 'hashed-random-password',
          }),
        }),
      );

      expect(result).toEqual({ user, org });
    });

    it('uses ANTHROPIC provider and its key when configured', async () => {
      process.env.DEMO_AI_PROVIDER = 'ANTHROPIC';
      process.env.ANTHROPIC_API_KEY = 'anthropic-secret';
      mockTx.organization.create.mockResolvedValue({ id: 'demo-org-x' });
      mockTx.user.create.mockResolvedValue({ id: 'demo-user-x' });

      await service.provisionSession();

      expect(mockTx.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: {
              create: expect.objectContaining({
                aiProvider: AiProvider.ANTHROPIC,
                aiApiKey: 'anthropic-secret',
              }),
            },
          }),
        }),
      );
    });

    it('generates a unique email for each session', async () => {
      const emails: string[] = [];
      mockTx.user.create.mockImplementation(
        (data: { data: { email: string } }) => {
          emails.push(data.data.email);
          return Promise.resolve({ id: `demo-user-${emails.length}` });
        },
      );
      mockTx.organization.create.mockImplementation(
        (data: { data: { id: string } }) =>
          Promise.resolve({ id: data.data.id }),
      );

      await service.provisionSession();
      await service.provisionSession();

      expect(emails).toHaveLength(2);
      expect(emails[0]).not.toBe(emails[1]);
      expect(emails[0]).toMatch(/^demo-.+@demo\.sanctions-guard\.local$/);
    });
  });

  describe('purgeExpiredSessions', () => {
    it('deletes demo organizations older than the TTL', async () => {
      mockPrisma.organization.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.purgeExpiredSessions();

      expect(mockPrisma.organization.deleteMany).toHaveBeenCalledWith({
        where: {
          isDemo: true,
          createdAt: { lt: expect.any(Date) },
        },
      });
      expect(result).toEqual({ removed: 3 });
    });

    it('returns removed: 0 and an error when the deletion fails', async () => {
      mockPrisma.organization.deleteMany.mockRejectedValue(
        new Error('db down'),
      );

      const result = await service.purgeExpiredSessions();

      expect(result).toEqual({ removed: 0, error: 'db down' });
    });

    it('respects a custom DEMO_SESSION_TTL_HOURS value', async () => {
      process.env.DEMO_SESSION_TTL_HOURS = '48';
      let capturedWhere:
        | { isDemo: boolean; createdAt: { lt: Date } }
        | undefined;

      mockPrisma.organization.deleteMany.mockImplementation(
        (args: { where: { isDemo: boolean; createdAt: { lt: Date } } }) => {
          capturedWhere = args.where;
          return Promise.resolve({ count: 1 });
        },
      );

      await service.purgeExpiredSessions();

      expect(capturedWhere).toBeDefined();
      const expectedCutoff = Date.now() - 48 * 60 * 60 * 1000;
      const lt = capturedWhere!.createdAt.lt.getTime();
      expect(lt).toBeLessThanOrEqual(expectedCutoff);
      expect(lt).toBeGreaterThan(expectedCutoff - 5000);
    });
  });
});
