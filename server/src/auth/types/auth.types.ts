import { Role } from '@prisma/client';
import { Request } from 'express';

export type JwtPayload = {
  sub: number;
  email: string;
  role: Role;
};

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    username: string | null;
    role: Role;
  };
}
