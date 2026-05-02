import { apiClient } from './client';
import type { Submission, SubmitCodeRequest } from '@/types/submission';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const submissionApi = {
  submitCode: async (data: SubmitCodeRequest): Promise<{ id: number; status: string }> => {
    const response = await apiClient.post<ApiResponse<{ id: number; status: string }>>('/submissions', data);
    return response.data.data!;
  },

  getSubmissions: async (params?: {
    page?: number;
    limit?: number;
    problem_id?: number;
    user_id?: number;
    status?: string;
  }): Promise<PaginatedResponse<Submission>> => {
    const response = await apiClient.get<PaginatedResponse<Submission>>('/submissions', { params });
    return response.data;
  },

  getSubmission: async (id: number): Promise<Submission> => {
    const response = await apiClient.get<ApiResponse<Submission>>(`/submissions/${id}`);
    return response.data.data!;
  },

  getUserSubmissions: async (userId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Submission>> => {
    const response = await apiClient.get<PaginatedResponse<Submission>>(`/submissions/user/${userId}`, { params });
    return response.data;
  },
};
