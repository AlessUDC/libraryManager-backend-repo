import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  code: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
