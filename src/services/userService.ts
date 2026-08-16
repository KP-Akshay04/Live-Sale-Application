import apiClient from './api';
import { User, Role } from '../types';

export interface UserApiResponse {
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
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFilterParams {
  search?: string;
  role?: string;
  depotId?: number;
  isActive?: boolean;
}

export interface CreateUserPayload {
  employeeId: string;
  employeeName: string;
  loginId?: string;
  username?: string;
  password: string;
  role: Role | string;
  depotId?: number | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  employeeId?: string;
  employeeName?: string;
  loginId?: string;
  username?: string;
  password?: string;
  role?: Role | string;
  depotId?: number | null;
  phone?: string | null;
  isActive?: boolean;
}

function mapApiUserToFrontendUser(apiUser: UserApiResponse): User {
  return {
    userId: apiUser.userId,
    employeeId: apiUser.employeeId,
    employeeName: apiUser.employeeName,
    loginId: apiUser.loginId,
    username: apiUser.loginId,
    role: apiUser.role as Role,
    roleCode: apiUser.roleCode,
    depotId: apiUser.depotId,
    depotName: apiUser.depotName,
    phone: apiUser.phone,
    isActive: apiUser.isActive,
  };
}

export const userService = {
  /**
   * Fetch all users with optional filtering
   */
  async getUsers(params?: UserFilterParams): Promise<User[]> {
    const response = await apiClient.get<{ success: boolean; data: UserApiResponse[] }>('/users', {
      params,
    });
    return (response.data.data || []).map(mapApiUserToFrontendUser);
  },

  /**
   * Fetch a single user by database ID or employeeId
   */
  async getUser(id: number | string): Promise<User> {
    const response = await apiClient.get<{ success: boolean; data: UserApiResponse }>(`/users/${id}`);
    return mapApiUserToFrontendUser(response.data.data);
  },

  /**
   * Create a new employee user in MySQL
   */
  async createUser(payload: CreateUserPayload): Promise<User> {
    const body = {
      ...payload,
      loginId: payload.loginId || payload.username,
    };
    const response = await apiClient.post<{ success: boolean; message: string; data: UserApiResponse }>(
      '/users',
      body
    );
    return mapApiUserToFrontendUser(response.data.data);
  },

  /**
   * Update an existing employee profile
   */
  async updateUser(id: number | string, payload: UpdateUserPayload): Promise<User> {
    const body = {
      ...payload,
      loginId: payload.loginId || payload.username,
    };
    const response = await apiClient.put<{ success: boolean; message: string; data: UserApiResponse }>(
      `/users/${id}`,
      body
    );
    return mapApiUserToFrontendUser(response.data.data);
  },

  /**
   * Activate or deactivate a user account
   */
  async updateUserStatus(id: number | string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch<{ success: boolean; message: string; data: UserApiResponse }>(
      `/users/${id}/status`,
      { isActive }
    );
    return mapApiUserToFrontendUser(response.data.data);
  },
};
