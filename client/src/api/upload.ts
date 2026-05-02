import { apiClient } from './client';

export const uploadApi = {
  uploadImage: async (base64Image: string): Promise<{ url: string; filename: string }> => {
    const response = await apiClient.post('/upload/image', { image: base64Image });
    return response.data.data;
  },
};
