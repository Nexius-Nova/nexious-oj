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
  created_at: string;
  username?: string;
  problem_title?: string;
  results?: SubmissionCaseResult[];
}

export interface SubmissionCaseResult {
  id: number;
  test_case_id: number;
  status: Exclude<SubmissionStatus, 'Pending' | 'Compiling' | 'Running' | 'Memory Limit Exceeded' | 'Presentation Error' | 'System Error'>;
  runtime: number;
  actual_output: string | null;
  input: string;
  expected_output: string;
  order: number;
  is_sample: boolean;
}

export interface SubmitCodeRequest {
  problem_id: number;
  language: string;
  code: string;
}
