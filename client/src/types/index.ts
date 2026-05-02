export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
}

export interface ProblemListParams {
  page?: number;
  limit?: number;
  difficulty?: string;
  search?: string;
}

export interface SubmissionListParams {
  page?: number;
  limit?: number;
  problem_id?: number;
  user_id?: number;
  status?: string;
}

export interface ContestListParams {
  page?: number;
  limit?: number;
  status?: string;
}

export type ProblemDifficulty = 'easy' | 'medium' | 'hard';

export type SubmissionStatus = 
  | 'Pending' 
  | 'Compiling' 
  | 'Running' 
  | 'Accepted' 
  | 'Wrong Answer' 
  | 'Time Limit Exceeded' 
  | 'Runtime Error' 
  | 'Compilation Error' 
  | 'System Error';

export type Language = 'c' | 'cpp' | 'python' | 'javascript' | 'java' | 'go';
