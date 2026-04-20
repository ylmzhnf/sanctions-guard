import { Role } from '@prisma/client';
import { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  orgId: string;
};

export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    username: string | null;
    role: Role;
    orgId: string;
  };
}
