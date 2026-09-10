import { Role } from '@prisma/client';
import { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  orgId: string;
  isDemo: boolean;
};

export interface UserSession {
  id: string;
  email: string;
  role: Role;
  orgId: string;
  isDemo: boolean;
  organization?: {
    id: string;
    name: string;
  };
}

export interface RequestWithUser extends Request {
  user: UserSession;
}
