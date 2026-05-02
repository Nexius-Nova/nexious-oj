import { pool } from '../config/database';

export interface DashboardStats {
  totalProblems: number;
  totalSubmissions: number;
  totalContests: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
}

export interface ProblemProgress {
  problem_id: number;
  status: 'accepted' | 'wrong' | 'attempted';
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const [problemRows] = await pool.query(
    'SELECT COUNT(*) as total FROM problems WHERE is_published = true'
  );

  const [submissionRows] = await pool.query(
    'SELECT COUNT(*) as total FROM submissions'
  );

  const [contestRows] = await pool.query(
    'SELECT COUNT(*) as total FROM contests'
  );

  const [acceptedRows] = await pool.query(
    "SELECT COUNT(*) as total FROM submissions WHERE status = 'Accepted'"
  );

  const problemCount = (problemRows as any[])[0];
  const submissionCount = (submissionRows as any[])[0];
  const contestCount = (contestRows as any[])[0];
  const acceptedCount = (acceptedRows as any[])[0];

  const totalSubmissions = submissionCount?.total || 0;
  const acceptedSubmissions = acceptedCount?.total || 0;
  const acceptanceRate = totalSubmissions > 0
    ? Math.round((acceptedSubmissions / totalSubmissions) * 100 * 10) / 10
    : 0;

  return {
    totalProblems: problemCount?.total || 0,
    totalSubmissions,
    totalContests: contestCount?.total || 0,
    acceptedSubmissions,
    acceptanceRate,
  };
};

export const getUserStats = async (userId: number) => {
  const [submissionRows] = await pool.query(
    'SELECT COUNT(*) as total FROM submissions WHERE user_id = ?',
    [userId]
  );

  const [acceptedRows] = await pool.query(
    "SELECT COUNT(*) as total FROM submissions WHERE user_id = ? AND status = 'Accepted'",
    [userId]
  );

  const [solvedRows] = await pool.query(
    `SELECT COUNT(DISTINCT problem_id) as total FROM submissions 
     WHERE user_id = ? AND status = 'Accepted'`,
    [userId]
  );

  const submissionCount = (submissionRows as any[])[0];
  const acceptedCount = (acceptedRows as any[])[0];
  const solvedCount = (solvedRows as any[])[0];

  const totalSubmissions = submissionCount?.total || 0;
  const acceptedSubmissions = acceptedCount?.total || 0;

  return {
    totalSubmissions,
    acceptedSubmissions,
    solvedProblems: solvedCount?.total || 0,
    acceptanceRate: totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 100 * 10) / 10
      : 0,
  };
};

export const getUserProblemProgress = async (userId: number): Promise<ProblemProgress[]> => {
  const [rows] = await pool.query(
    `SELECT 
      s.problem_id,
      CASE 
        WHEN MAX(CASE WHEN s.status = 'Accepted' THEN 1 ELSE 0 END) = 1 THEN 'accepted'
        WHEN MAX(CASE WHEN s.status IN ('Wrong Answer', 'Runtime Error', 'Time Limit Exceeded', 'Compilation Error') THEN 1 ELSE 0 END) = 1 THEN 'wrong'
        ELSE 'attempted'
      END as status
    FROM submissions s
    WHERE s.user_id = ?
    GROUP BY s.problem_id`,
    [userId]
  );

  return rows as ProblemProgress[];
};

export const getUserSubmissionTrend = async (userId: number, days: number = 30) => {
  const [rows] = await pool.query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END) as accepted
    FROM submissions
    WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC`,
    [userId, days]
  );

  return rows;
};

export const getUserLanguageDistribution = async (userId: number) => {
  const [rows] = await pool.query(
    `SELECT 
      language,
      COUNT(*) as count
    FROM submissions
    WHERE user_id = ?
    GROUP BY language
    ORDER BY count DESC`,
    [userId]
  );

  return rows;
};
