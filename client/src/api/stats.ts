import { apiClient } from './client';

export interface DashboardStats {
  totalProblems: number;
  totalSubmissions: number;
  totalContests: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
}

export interface UserStats {
  totalSubmissions: number;
  acceptedSubmissions: number;
  solvedProblems: number;
  acceptanceRate: number;
}

export interface ProblemProgress {
  problem_id: number;
  status: 'accepted' | 'wrong' | 'attempted';
}

export interface SubmissionTrend {
  date: string;
  total: number;
  accepted: number;
}

export interface LanguageDistribution {
  language: string;
  count: number;
}

export const statsApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/stats/dashboard');
    return response.data.data;
  },

  getUserStats: async (userId: number): Promise<UserStats> => {
    const response = await apiClient.get(`/stats/user/${userId}`);
    return response.data.data;
  },

  getMyStats: async (): Promise<UserStats> => {
    const response = await apiClient.get('/stats/me');
    return response.data.data;
  },

  getMyProblemProgress: async (): Promise<ProblemProgress[]> => {
    const response = await apiClient.get('/stats/me/progress');
    return response.data.data;
  },

  getMySubmissionTrend: async (days: number = 30): Promise<SubmissionTrend[]> => {
    const response = await apiClient.get(`/stats/me/trend?days=${days}`);
    return response.data.data;
  },

  getMyLanguageDistribution: async (): Promise<LanguageDistribution[]> => {
    const response = await apiClient.get('/stats/me/languages');
    return response.data.data;
  },
};
