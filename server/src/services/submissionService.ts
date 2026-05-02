import { pool } from '../config/database';
import { Submission, SubmissionStatus } from '../types';
import { processSubmission } from './judgeService';

interface CreateSubmissionData {
  user_id: number;
  problem_id: number;
  language: string;
  code: string;
}

interface FindAllOptions {
  page: number;
  limit: number;
  problemId?: number;
  userId?: number;
  status?: string;
}

export const create = async (data: CreateSubmissionData): Promise<Submission> => {
  const [result] = await pool.query(
    `INSERT INTO submissions
     (user_id, problem_id, language, code, status, test_cases_passed, test_cases_total)
     VALUES (?, ?, ?, ?, 'Pending', 0, 0)`,
    [data.user_id, data.problem_id, data.language, data.code]
  );

  const insertResult = result as any;

  processSubmission(insertResult.insertId);

  const [rows] = await pool.query(
    'SELECT * FROM submissions WHERE id = ?',
    [insertResult.insertId]
  );

  return (rows as Submission[])[0];
};

export const findById = async (id: number): Promise<Submission | null> => {
  const [rows] = await pool.query(
    `SELECT s.*, u.username, p.title as problem_title
     FROM submissions s
     JOIN users u ON s.user_id = u.id
     JOIN problems p ON s.problem_id = p.id
     WHERE s.id = ?`,
    [id]
  );
  const submissions = rows as any[];

  if (submissions.length === 0) {
    return null;
  }

  const submission = submissions[0];

  const [resultRows] = await pool.query(
    `SELECT sr.id, sr.test_case_id, sr.status, sr.runtime, sr.actual_output,
            tc.input, tc.expected_output, tc.is_sample, tc.\`order\`
     FROM submission_results sr
     JOIN test_cases tc ON tc.id = sr.test_case_id
     WHERE sr.submission_id = ?
     ORDER BY tc.\`order\`, sr.id`,
    [id]
  );

  return {
    ...submission,
    results: resultRows as any[],
  } as Submission;
};

export const findAll = async (
  options: FindAllOptions
): Promise<{ submissions: any[]; total: number }> => {
  const { page, limit, problemId, userId, status } = options;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params: any[] = [];

  if (problemId) {
    whereClause += ' AND s.problem_id = ?';
    params.push(problemId);
  }

  if (userId) {
    whereClause += ' AND s.user_id = ?';
    params.push(userId);
  }

  if (status) {
    whereClause += ' AND s.status = ?';
    params.push(status);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM submissions s WHERE ${whereClause}`,
    params
  );

  const [submissionRows] = await pool.query(
    `SELECT s.id, s.user_id, s.problem_id, s.language, s.status, s.runtime, s.memory,
            s.test_cases_passed, s.test_cases_total, s.created_at,
            u.username, p.title as problem_title
     FROM submissions s
     JOIN users u ON s.user_id = u.id
     JOIN problems p ON s.problem_id = p.id
     WHERE ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    submissions: submissionRows as any[],
    total: (countRows as any[])[0].total,
  };
};

export const findByUserId = async (
  userId: number,
  page: number,
  limit: number
): Promise<{ submissions: any[]; total: number }> => {
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    'SELECT COUNT(*) as total FROM submissions WHERE user_id = ?',
    [userId]
  );

  const [submissionRows] = await pool.query(
    `SELECT s.id, s.problem_id, s.language, s.status, s.runtime, s.memory,
            s.test_cases_passed, s.test_cases_total, s.created_at,
            p.title as problem_title, p.difficulty
     FROM submissions s
     JOIN problems p ON s.problem_id = p.id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return {
    submissions: submissionRows as any[],
    total: (countRows as any[])[0].total,
  };
};

export const updateStatus = async (
  id: number,
  data: {
    status: SubmissionStatus;
    runtime?: number;
    memory?: number;
    test_cases_passed?: number;
    test_cases_total?: number;
    error_message?: string;
  }
): Promise<void> => {
  const fields: string[] = ['status = ?'];
  const values: any[] = [data.status];

  if (data.runtime !== undefined) {
    fields.push('runtime = ?');
    values.push(data.runtime);
  }
  if (data.memory !== undefined) {
    fields.push('memory = ?');
    values.push(data.memory);
  }
  if (data.test_cases_passed !== undefined) {
    fields.push('test_cases_passed = ?');
    values.push(data.test_cases_passed);
  }
  if (data.test_cases_total !== undefined) {
    fields.push('test_cases_total = ?');
    values.push(data.test_cases_total);
  }
  if (data.error_message !== undefined) {
    fields.push('error_message = ?');
    values.push(data.error_message);
  }

  values.push(id);
  await pool.query(
    `UPDATE submissions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};
