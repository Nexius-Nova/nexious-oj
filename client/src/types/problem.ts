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
  acceptance: number;
  submission_count: number;
  accepted_count: number;
  creator_id: number | null;
  is_public: boolean;
}

export interface ProblemTestCaseInput {
  input: string;
  expected_output: string;
  is_sample?: boolean;
  order?: number;
}

export interface CreateProblemPayload {
  title: string;
  slug?: string;
  description: string;
  input_description: string;
  output_description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit: number;
  memory_limit: number;
  sample_input: string;
  sample_output: string;
  sample_cases?: Array<{
    input: string;
    output: string;
  }>;
  hints?: string;
  solution?: string;
  generator_code?: string;
  generator_language?: string;
  solution_code?: string;
  solution_language?: string;
  category_id?: number | null;
  tag_ids?: number[];
  test_cases: ProblemTestCaseInput[];
}

export interface ProblemList {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  acceptance: number;
  submission_count: number;
  is_public: boolean;
  creator_id: number | null;
  category_id: number | null;
}
