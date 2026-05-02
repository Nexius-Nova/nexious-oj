import { apiClient } from './client';
import type { CreateProblemPayload, Problem, ProblemList } from '@/types/problem';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { SubmissionStatus } from '@/types/submission';

export interface RunCodeResult {
  status: SubmissionStatus;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  runtime: number;
  errorMessage?: string;
}

export interface AiGeneratedTestCase {
  input: string;
  expected_output: string;
}

export const problemApi = {
  getProblems: async (params?: {
    page?: number;
    limit?: number;
    difficulty?: string;
    search?: string;
    tag_name?: string;
  }): Promise<PaginatedResponse<ProblemList>> => {
    const response = await apiClient.get<PaginatedResponse<ProblemList>>('/problems', { params });
    return response.data;
  },

  getProblem: async (id: number): Promise<Problem> => {
    const response = await apiClient.get<ApiResponse<Problem>>(`/problems/${id}`);
    return response.data.data!;
  },

  createProblem: async (data: CreateProblemPayload): Promise<Problem> => {
    const response = await apiClient.post<ApiResponse<Problem>>('/problems', data);
    return response.data.data!;
  },

  updateProblem: async (id: number, data: Partial<Problem> & { tag_ids?: number[] }): Promise<Problem> => {
    const response = await apiClient.put<ApiResponse<Problem>>(`/problems/${id}`, data);
    return response.data.data!;
  },

  deleteProblem: async (id: number): Promise<void> => {
    await apiClient.delete(`/problems/${id}`);
  },

  addTestCase: async (problemId: number, data: {
    input: string;
    expected_output: string;
    is_sample?: boolean;
    order?: number;
  }): Promise<void> => {
    await apiClient.post(`/problems/${problemId}/testcases`, data);
  },

  getTestCases: async (problemId: number): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/problems/${problemId}/testcases`);
    return response.data.data ?? [];
  },

  updateTestCase: async (problemId: number, testCaseId: number, data: {
    input: string;
    expected_output: string;
  }): Promise<void> => {
    await apiClient.put(`/problems/${problemId}/testcases/${testCaseId}`, data);
  },

  deleteTestCase: async (problemId: number, testCaseId: number): Promise<void> => {
    await apiClient.delete(`/problems/${problemId}/testcases/${testCaseId}`);
  },

  batchAddTestCases: async (problemId: number, testCases: Array<{
    input: string;
    expected_output: string;
  }>): Promise<{ count: number }> => {
    const response = await apiClient.post<ApiResponse<{ count: number }>>(
      `/problems/${problemId}/testcases/batch`,
      { test_cases: testCases }
    );
    return response.data.data!;
  },

  runCode: async (problemId: number, data: {
    code: string;
    language: string;
    input?: string;
    expected_output?: string;
  }): Promise<RunCodeResult> => {
    const response = await apiClient.post<ApiResponse<RunCodeResult>>(`/problems/${problemId}/run`, data);
    return response.data.data!;
  },

  generateTestCases: async (problemId: number, data: {
    generator_code: string;
    generator_language: string;
    solution: string;
    solution_language: string;
    count?: number;
  }) => {
    const response = await apiClient.post(`/problems/${problemId}/generate-testcases`, data);
    return response.data;
  },

  previewTestCases: async (data: {
    generator_code: string;
    generator_language: string;
    solution: string;
    solution_language: string;
    count?: number;
  }) => {
    const response = await apiClient.post('/problems/preview-testcases', data);
    return response.data;
  },

  generateAiAnalysis: async (problemId: number): Promise<string> => {
    const response = await apiClient.post<ApiResponse<{ analysis: string }>>(`/problems/${problemId}/ai-analysis`);
    return response.data.data!.analysis;
  },

  generateAiTestCases: async (data: {
    title: string;
    description: string;
    input_description: string;
    output_description: string;
    sample_input: string;
    sample_output: string;
    sample_cases?: Array<{ input: string; output: string }>;
    hints?: string;
    solution?: string;
    count?: number;
  }): Promise<AiGeneratedTestCase[]> => {
    const response = await apiClient.post<ApiResponse<AiGeneratedTestCase[]>>('/problems/ai-testcases', data);
    return response.data.data ?? [];
  },

  generateAiGenerator: async (data: {
    title: string;
    description: string;
    input_description: string;
    output_description: string;
    sample_cases?: Array<{ input: string; output: string }>;
    hints?: string;
    solution?: string;
    preferred_language?: string;
  }): Promise<{
    generator_code: string;
    generator_language: string;
    solution_code: string;
    solution_language: string;
    self_check?: { issues: string[] };
  }> => {
    const response = await apiClient.post<ApiResponse<{
      generator_code: string;
      generator_language: string;
      solution_code: string;
      solution_language: string;
      self_check?: { issues: string[] };
    }>>('/problems/ai-generator', data);
    return response.data.data!;
  },

  runGenerator: async (problemId: number): Promise<{ input: string; output?: string }> => {
    const response = await apiClient.post<ApiResponse<{ input: string; output?: string }>>(`/problems/${problemId}/run-generator`);
    return response.data.data!;
  },

  saveCodeDraft: async (problemId: number, data: { code: string; language: string }): Promise<void> => {
    await apiClient.post(`/problems/${problemId}/draft`, data);
  },

  getCodeDraft: async (problemId: number): Promise<{ code: string; language: string } | null> => {
    const response = await apiClient.get<ApiResponse<{ code: string; language: string } | null>>(`/problems/${problemId}/draft`);
    return response.data.data ?? null;
  },
};
