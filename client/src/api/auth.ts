import { apiClient } from './client';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '@/types/user';
import type { ApiResponse } from '@/types';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<{ id: number; username: string; email: string; avatar: string | null; bio: string | null; rating: number; rank: string; role: string; has_ai_api_key?: boolean; ai_base_url?: string | null; ai_model?: string | null }>>('/auth/me');
    const user = response.data.data!;
    return {
      ...user,
      role: user.role as User['role'],
    };
  },

  updateProfile: async (data: Partial<User> & { ai_api_key?: string; ai_base_url?: string; ai_model?: string }): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>('/auth/profile', data);
    return response.data.data!;
  },
};
