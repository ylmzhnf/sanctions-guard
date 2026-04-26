import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService (HMAC Integrity & Security)', () => {
  let service: AuditService;
  let dbMock: any = null; 


  const mockPrisma = {
    auditLog: {
      create: jest.fn().mockImplementation(({ data }) => {
        dbMock = { ...data };
        return Promise.resolve(dbMock);
      }),
      findUniqueOrThrow: jest.fn().mockImplementation(() =>
        Promise.resolve(dbMock),
      ),
    },
  };

  beforeEach(async () => {
    process.env.AUDIT_LOG_SECRET = 'test-secret-key-12345';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    dbMock = null; 
  });

  it('should generate a 64-character SHA-256 integrity hash', async () => {
    await service.log({
      action: 'SCREENING_PERFORMED',
      actorId: 'user-uuid-1',
      orgId: 'org-uuid-1',
      metadata: { target: 'Roman Abramovich', risk: 'HIGH' },
    });

    expect(dbMock.integrityHash).toBeDefined();
    expect(dbMock.integrityHash).toHaveLength(64);
  });

  it('should verify original (untampered) logs as valid', async () => {
    await service.log({
      action: 'LOGIN_SUCCESS',
      actorId: 'user-uuid-1',
      orgId: 'org-uuid-1',
      metadata: { ip: '127.0.0.1' },
    });

    const { valid } = await service.verifyLog(dbMock.id);
    expect(valid).toBe(true);
  });

  it('should detect tampering when metadata is modified', async () => {
    await service.log({
      action: 'RISK_LEVEL_CHANGED',
      actorId: 'admin-1',
      orgId: 'org-1',
      metadata: { from: 'HIGH', to: 'LOW' }
    });

    
    dbMock.metadata = { from: 'HIGH', to: 'CRITICAL' }; 

    const { valid } = await service.verifyLog(dbMock.id);
    expect(valid).toBe(false);
  });

  it('should detect tampering when the hash itself is modified', async () => {
    await service.log({ 
      action: 'DELETE_QUERY', 
      actorId: 'u-1', 
      orgId: 'o-1',
      metadata: { queryId: 'q-100' },
    });

    dbMock.integrityHash = 'a'.repeat(64);

    const { valid } = await service.verifyLog(dbMock.id);
    expect(valid).toBe(false);
  });

  it('should maintain validity even if metadata keys are reordered (Canonical Stringify test)', async () => {
    await service.log({
      action: 'TEST_SORTING',
      actorId: 'u-1',
      orgId: 'o-1',
      metadata: { z: 1, a: 2 },
    });

    dbMock.metadata = { a: 2, z: 1 };

    const { valid } = await service.verifyLog(dbMock.id);
    expect(valid).toBe(true);
  });
});