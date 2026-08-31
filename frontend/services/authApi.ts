import apiClient from './api';
import { User } from '../types';

export interface AuthUserResponse {
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

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: AuthUserResponse;
    token: string;
  };
}

export interface AuthMeResponse {
  success: boolean;
  data: {
    user: AuthUserResponse;
  };
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export const authApi = {
  async login(loginId: string, password: string): Promise<LoginResponse['data']> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      loginId,
      password,
    });

    return response.data.data;
  },

  async getMe(): Promise<AuthUserResponse> {
    const response = await apiClient.get<AuthMeResponse>('/auth/me');

    return response.data.data.user;
  },


    async changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
  }>('/auth/change-password', {
    currentPassword,
    newPassword,
  });

  return response.data;
},  

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/auth/logout'
      );

      return response.data;
    } catch {
      return {
        success: true,
        message: 'Logged out locally',
      };
    }
  },
};

export function mapSafeUserToUser(safeUser: AuthUserResponse): User {
  return {
    userId: safeUser.userId,
    employeeId: safeUser.employeeId,
    employeeName: safeUser.employeeName,
    loginId: safeUser.loginId,
    username: safeUser.loginId,
    role: safeUser.role as User['role'],
    roleCode: safeUser.roleCode,
    depotId: safeUser.depotId,
    depotName: safeUser.depotName,
    phone: safeUser.phone,
    isActive: safeUser.isActive,
  };
}