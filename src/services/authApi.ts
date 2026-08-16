import apiClient from './api';
import { User } from '../types';

export interface LoginResponse {
  user: {
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
  };
  token: string;
}

export interface AuthMeResponse {
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

export const authApi = {
  async login(loginId: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      loginId,
      password,
    });
    return response.data;
  },

  async getMe(): Promise<AuthMeResponse> {
    const response = await apiClient.get<AuthMeResponse>('/auth/me');
    return response.data;
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
      return response.data;
    } catch {
      return { success: true, message: 'Logged out locally' };
    }
  },
};

export function mapSafeUserToUser(safeUser: AuthMeResponse): User {
  return {
    userId: safeUser.userId,
    employeeId: safeUser.employeeId,
    employeeName: safeUser.employeeName,
    loginId: safeUser.loginId,
    username: safeUser.loginId, // mapped for compatibility
    role: safeUser.role as User['role'],
    roleCode: safeUser.roleCode,
    depotId: safeUser.depotId,
    depotName: safeUser.depotName,
    phone: safeUser.phone,
    isActive: safeUser.isActive,
  };
}
