import { apiClient } from './client';

export interface ContestData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: number;
  is_public: boolean;
  random_mode?: boolean;
  problem_count?: number;
}

export const contestApi = {
  getContests: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get('/contests', { params });
    return response.data;
  },

  getContest: async (id: number) => {
    const response = await apiClient.get(`/contests/${id}`);
    return response.data;
  },

  getContestByInvite: async (inviteCode: string) => {
    const response = await apiClient.get(`/contests/invite/${inviteCode}`);
    return response.data;
  },

  joinByInvite: async (inviteCode: string) => {
    const response = await apiClient.post(`/contests/invite/${inviteCode}/join`);
    return response.data;
  },

  createContest: async (data: ContestData) => {
    const response = await apiClient.post('/contests', data);
    return response.data;
  },

  updateContest: async (id: number, data: Partial<ContestData>) => {
    const response = await apiClient.put(`/contests/${id}`, data);
    return response.data;
  },

  deleteContest: async (id: number) => {
    const response = await apiClient.delete(`/contests/${id}`);
    return response.data;
  },

  joinContest: async (id: number, password?: string) => {
    const response = await apiClient.post(`/contests/${id}/join`, { password });
    return response.data;
  },

  getParticipants: async (id: number) => {
    const response = await apiClient.get(`/contests/${id}/participants`);
    return response.data;
  },

  getParticipantSession: async (contestId: number, participantId: number) => {
    const response = await apiClient.get(`/contests/${contestId}/participants/${participantId}/session`);
    return response.data;
  },

  addProblem: async (contestId: number, problemId: number, order?: number) => {
    const response = await apiClient.post(`/contests/${contestId}/problems`, { problemId, order });
    return response.data;
  },

  removeProblem: async (contestId: number, problemId: number) => {
    const response = await apiClient.delete(`/contests/${contestId}/problems/${problemId}`);
    return response.data;
  },

  updateProblemOrder: async (contestId: number, problemId: number, order: number) => {
    const response = await apiClient.put(`/contests/${contestId}/problems/${problemId}/order`, { order });
    return response.data;
  },

  startContest: async (id: number) => {
    const response = await apiClient.post(`/contests/${id}/start`);
    return response.data;
  },

  getContestSession: async (id: number) => {
    const response = await apiClient.get(`/contests/${id}/session`);
    return response.data;
  },

  saveAnswer: async (id: number, data: { problemId: number; code: string; language: string }) => {
    const response = await apiClient.post(`/contests/${id}/save`, data);
    return response.data;
  },

  submitAnswer: async (id: number, data: { problemId: number; code: string; language: string }) => {
    const response = await apiClient.post(`/contests/${id}/submit`, data);
    return response.data;
  },

  finishContest: async (id: number) => {
    const response = await apiClient.post(`/contests/${id}/finish`);
    return response.data;
  },

  getContestResults: async (id: number) => {
    const response = await apiClient.get(`/contests/${id}/results`);
    return response.data;
  },

  getStatistics: async (id: number) => {
    const response = await apiClient.get(`/contests/${id}/statistics`);
    return response.data;
  },
};
