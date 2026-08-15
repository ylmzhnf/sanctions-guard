import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './guard/roles.guard';
import { OrgIsolationGuard } from './guard/org-isolation.guard';

describe('Security Guards', () => {
  let rolesGuard: RolesGuard;
  let orgIsolationGuard: OrgIsolationGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        OrgIsolationGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    rolesGuard = module.get<RolesGuard>(RolesGuard);
    orgIsolationGuard = module.get<OrgIsolationGuard>(OrgIsolationGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('RolesGuard', () => {
    const createMockContext = (user: any, requiredRoles: Role[] = []) => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;
    };

    it('should allow access when no roles are required', () => {
      const context = createMockContext({ role: Role.USER }, []);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow SUPER_ADMIN to access ADMIN endpoints', () => {
      const context = createMockContext(
        { role: Role.SUPER_ADMIN },
        [Role.ADMIN, Role.SUPER_ADMIN],
      );
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow ADMIN to access ADMIN endpoints', () => {
      const context = createMockContext(
        { role: Role.ADMIN },
        [Role.ADMIN, Role.SUPER_ADMIN],
      );
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should deny USER access to ADMIN endpoints', () => {
      const context = createMockContext(
        { role: Role.USER },
        [Role.ADMIN, Role.SUPER_ADMIN],
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny USER access to SUPER_ADMIN only endpoints', () => {
      const context = createMockContext(
        { role: Role.USER },
        [Role.SUPER_ADMIN],
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny ADMIN access to SUPER_ADMIN only endpoints', () => {
      const context = createMockContext(
        { role: Role.ADMIN },
        [Role.SUPER_ADMIN],
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('OrgIsolationGuard', () => {
    const createMockContext = (user: any, params: any = {}, skipIsolation = false) => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(skipIsolation);
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user, params }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;
    };

    it('should allow SUPER_ADMIN to access any organization', () => {
      const context = createMockContext(
        { role: Role.SUPER_ADMIN, orgId: 'org1' },
        { orgId: 'org2' },
      );
      expect(orgIsolationGuard.canActivate(context)).toBe(true);
    });

    it('should allow user to access their own organization', () => {
      const context = createMockContext(
        { role: Role.ADMIN, orgId: 'org1' },
        { orgId: 'org1' },
      );
      expect(orgIsolationGuard.canActivate(context)).toBe(true);
    });

    it('should deny user access to other organizations', () => {
      const context = createMockContext(
        { role: Role.ADMIN, orgId: 'org1' },
        { orgId: 'org2' },
      );
      expect(() => orgIsolationGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access when skipIsolation decorator is present', () => {
      const context = createMockContext(
        { role: Role.ADMIN, orgId: 'org1' },
        { orgId: 'org2' },
        true,
      );
      expect(orgIsolationGuard.canActivate(context)).toBe(true);
    });
  });
});