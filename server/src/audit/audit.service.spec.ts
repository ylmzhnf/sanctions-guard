import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService (HMAC Integrity)', () => {
  let service: AuditService;
  let storedData: any;

  const mockPrisma = {
    auditLog: {
      create: jest.fn().mockImplementation(({ data }) => {
        storedData = { ...data };
        return Promise.resolve(storedData);
      }),
      findUniqueOrThrow: jest.fn().mockImplementation(() =>
        Promise.resolve(storedData),
      ),
    },
  };

  beforeEach(async () => {
    process.env.HMAC_SECRET = 'super-secret-key-for-testing';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should generate a 64-character SHA-256 integrity hash', async () => {
    await service.log({
      action: 'SCREENING_PERFORMED',
      userId: 'user-1',
      orgId: 'org-1',
      metadata: { target: 'Roman Abramovich' },
    });

    expect(storedData.integrityHash).toBeDefined();
    expect(storedData.integrityHash).toHaveLength(64); 
  });

  it('should verify original logs as valid', async () => {
    await service.log({
      action: 'LOGIN_ATTEMPT',
      userId: 'user-1',
      orgId: 'org-1',
      metadata: {},
    });

    const { valid } = await service.verifyLog(storedData.id);
    expect(valid).toBe(true);
  });

  it('should detect tampering when data is modified', async () => {
    await service.log({
      action: 'CRITICAL_MATCH_FOUND',
      userId: 'user-1',
      orgId: 'org-1',
      metadata: { risk: 'HIGH' }
    });

    storedData.metadata = { risk: 'LOW' }; 

    const { valid } = await service.verifyLog(storedData.id);
    
    expect(valid).toBe(false);
  });

  it('should detect tampering when hash itself is changed', async () => {
    await service.log({ 
      action: 'DELETE_QUERY', 
      userId: 'u-1', 
      orgId: 'o-1',
      metadata: {},
    });

    storedData.integrityHash = 'fake-hash-value';

    const { valid } = await service.verifyLog(storedData.id);
    expect(valid).toBe(false);
  });
});