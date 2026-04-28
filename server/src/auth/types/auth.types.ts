import { Role, Plan } from '@prisma/client';
import { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  orgId: string;
};

export interface UserSession {
  id: string;
  email: string;
  role: Role;
  orgId: string;
  org?: {
    plan: Plan;
    isUnlimited: boolean;
  };
}
export interface RequestWithUser extends Request {
  user: UserSession;
}
