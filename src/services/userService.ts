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

interface UserListResponse {
  success: boolean;
  data: UserApiResponse[];
  count?: number;
}

interface UserResponse {
  success: boolean;
  message?: string;
  data: UserApiResponse;
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
   * Fetch users from the backend.
   *
   * IMPORTANT:
   * Depot-scoped authorization is enforced by the backend.
   * This service does not attempt to determine or override
   * the authenticated user's depot.
   */
  async getUsers(params?: UserFilterParams): Promise<User[]> {
    const response = await apiClient.get<UserListResponse>('/users', {
      params,
    });

    return (response.data.data || []).map(mapApiUserToFrontendUser);
  },

  /**
   * Fetch one user by database ID or employee ID.
   */
  async getUser(id: number | string): Promise<User> {
    const response = await apiClient.get<UserResponse>(
      `/users/${encodeURIComponent(String(id))}`
    );

    return mapApiUserToFrontendUser(response.data.data);
  },

  /**
   * Create a new user.
   *
   * The backend remains authoritative for:
   * - role
   * - depot assignment
   * - uniqueness
   * - password hashing
   * - account status
   */
  async createUser(payload: CreateUserPayload): Promise<User> {
    const body = {
      ...payload,
      loginId: payload.loginId?.trim() || payload.username?.trim(),
    };

    const response = await apiClient.post<UserResponse>(
      '/users',
      body
    );

    return mapApiUserToFrontendUser(response.data.data);
  },

  /**
   * Update an existing user.
   */
  async updateUser(
    id: number | string,
    payload: UpdateUserPayload
  ): Promise<User> {
    const body = {
      ...payload,
      loginId: payload.loginId?.trim() || payload.username?.trim(),
    };

    const response = await apiClient.put<UserResponse>(
      `/users/${encodeURIComponent(String(id))}`,
      body
    );

    return mapApiUserToFrontendUser(response.data.data);
  },

  /**
   * Activate or deactivate a user account.
   */
  async updateUserStatus(
    id: number | string,
    isActive: boolean
  ): Promise<User> {
    const response = await apiClient.patch<UserResponse>(
      `/users/${encodeURIComponent(String(id))}/status`,
      {
        isActive,
      }
    );

    return mapApiUserToFrontendUser(response.data.data);
  },
};

export default userService;