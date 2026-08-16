import { Request } from 'express';

export interface JWTPayload {
  userId: number;
  role: string;
  roleCode: string;
  loginId: string;
  depotId: number | null;
  iat?: number;
  exp?: number;
}

export interface SafeUser {
  userId: number;
  employeeId: string;
  employeeName: string;
  loginId: string;
  phone: string | null;
  role: string;
  roleCode: string;
  depotId: number | null;
  depotName: string | null;
  isActive: boolean;
}

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponseData {
  user: SafeUser;
  token: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}
