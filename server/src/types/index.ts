export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  ai_api_key: string | null;
  ai_base_url: string | null;
  ai_model: string | null;
  avatar: string | null;
  bio: string | null;
  rating: number;
  rank: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface Problem {
  id: number;
  title: string;
  slug: string;
  description: string;
  input_description: string;
  output_description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category_id: number | null;
  time_limit: number;
  memory_limit: number;
  sample_input: string;
  sample_output: string;
  sample_cases?: Array<{
    input: string;
    output: string;
  }> | null;
  hints: string | null;
  solution: string | null;
  generator_code: string | null;
  generator_language: string | null;
  solution_code: string | null;
  solution_language: string | null;
  source: string | null;
  creator_id: number | null;
  is_public: boolean;
  is_published: boolean;
  acceptance: number;
  submission_count: number;
  accepted_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProblemPayload extends Partial<Problem> {
  test_cases?: Array<{
    input: string;
    expected_output: string;
    is_sample?: boolean;
    order?: number;
  }>;
  tag_ids?: number[];
}

export interface TestCase {
  id: number;
  problem_id: number;
  input: string;
  expected_output: string;
  is_sample: boolean;
  order: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface ProblemTag {
  problem_id: number;
  tag_id: number;
}

export type SubmissionStatus = 
  | 'Pending'
  | 'Compiling'
  | 'Running'
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compilation Error'
  | 'Presentation Error'
  | 'System Error';

export interface Submission {
  id: number;
  user_id: number;
  problem_id: number;
  language: string;
  code: string;
  status: SubmissionStatus;
  runtime: number | null;
  memory: number | null;
  test_cases_passed: number;
  test_cases_total: number;
  error_message: string | null;
  created_at: Date;
}

export interface Contest {
  id: number;
  title: string;
  description: string;
  start_time: Date;
  end_time: Date;
  duration: number;
  creator_id: number;
  is_public: boolean;
  password: string | null;
  invite_code: string | null;
  random_mode?: boolean;
  problem_count?: number;
  created_at: Date;
}

export interface ContestProblem {
  contest_id: number;
  problem_id: number;
  order: number;
}

export interface ContestParticipant {
  contest_id: number;
  user_id: number;
  joined_at: Date;
}

export interface Discussion {
  id: number;
  problem_id: number | null;
  user_id: number;
  title: string;
  content: string;
  type: 'solution' | 'discussion';
  likes_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  id: number;
  discussion_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  created_at: Date;
}

export interface ApiResponse<T = any> {
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
