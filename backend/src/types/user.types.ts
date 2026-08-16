import { SafeUser } from './auth.types.js';

export interface UserFilterQuery {
  search?: string;
  role?: string;
  depotId?: number;
  isActive?: boolean;
}

export interface CreateUserDTO {
  employeeId: string;
  employeeName: string;
  loginId: string;
  username?: string; // alias for loginId from legacy frontend
  password: string;
  role: string;
  depotId?: number | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface UpdateUserDTO {
  employeeId?: string;
  employeeName?: string;
  loginId?: string;
  username?: string;
  password?: string;
  role?: string;
  depotId?: number | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface UpdateUserStatusDTO {
  isActive: boolean;
}

export interface UserResponseDTO extends SafeUser {
  createdAt: Date;
  updatedAt: Date;
}
