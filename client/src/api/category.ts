import { apiClient } from './client';

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
}

export const categoryApi = {
  getTags: async (): Promise<Tag[]> => {
    const response = await apiClient.get('/tags');
    return response.data.data;
  },

  getTag: async (id: number): Promise<Tag> => {
    const response = await apiClient.get(`/tags/${id}`);
    return response.data.data;
  },

  createTag: async (data: Partial<Tag>): Promise<Tag> => {
    const response = await apiClient.post('/tags', data);
    return response.data.data;
  },

  getProblemTags: async (problemId: number): Promise<Tag[]> => {
    const response = await apiClient.get(`/problems/${problemId}/tags`);
    return response.data.data;
  },

  setProblemTags: async (problemId: number, tagIds: number[]): Promise<void> => {
    await apiClient.put(`/problems/${problemId}/tags`, { tagIds });
  },
};
