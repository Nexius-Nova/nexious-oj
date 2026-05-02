import { pool } from '../config/database';
import { Contest } from '../types';
import { HttpError } from '../middlewares/errorHandler';
import { processSubmission } from './judgeService';
import { randomUUID } from 'crypto';

function generateInviteCode(): string {
  return randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
}

interface FindAllOptions {
  page: number;
  limit: number;
  status?: string;
  userId?: number;
}

export const findAll = async (
  options: FindAllOptions
): Promise<{ contests: any[]; total: number }> => {
  const { page, limit, status, userId } = options;
  const offset = (page - 1) * limit;

  let whereClause = userId
    ? '(is_public = true OR creator_id = ?)'
    : 'is_public = true';
  const params: any[] = userId ? [userId] : [];

  const now = new Date();
  if (status === 'upcoming') {
    whereClause += ' AND start_time > ?';
    params.push(now);
  } else if (status === 'ongoing') {
    whereClause += ' AND start_time <= ? AND end_time > ?';
    params.push(now, now);
  } else if (status === 'ended') {
    whereClause += ' AND end_time <= ?';
    params.push(now);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM contests WHERE ${whereClause}`,
    params
  );

  const [contestRows] = await pool.query(
    `SELECT c.*, u.username as creator_name,
       (SELECT COUNT(*) FROM contest_problems WHERE contest_id = c.id) as problem_count
     FROM contests c
     JOIN users u ON c.creator_id = u.id
     WHERE ${whereClause}
     ORDER BY start_time DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    contests: contestRows as any[],
    total: (countRows as any[])[0].total,
  };
};

export const findById = async (id: number): Promise<any | null> => {
  const [rows] = await pool.query(
    `SELECT c.*, u.username as creator_name
     FROM contests c
     JOIN users u ON c.creator_id = u.id
     WHERE c.id = ?`,
    [id]
  );
  const contests = rows as any[];

  if (contests.length === 0) return null;

  const contest = contests[0];

  const [problems] = await pool.query(
    `SELECT p.id, p.title, p.difficulty, cp.order
     FROM contest_problems cp
     JOIN problems p ON cp.problem_id = p.id
     WHERE cp.contest_id = ?
     ORDER BY cp.order`,
    [id]
  );

  contest.problems = problems;
  return contest;
};

export const create = async (contestData: Partial<Contest>): Promise<Contest> => {
  const {
    title,
    description,
    start_time,
    end_time,
    duration,
    creator_id,
    is_public,
    password,
    random_mode,
    problem_count,
  } = contestData;

  const inviteCode = generateInviteCode();

  const [result] = await pool.query(
    `INSERT INTO contests
     (title, description, start_time, end_time, duration, creator_id, is_public, password, invite_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, start_time, end_time, duration || 180, creator_id, is_public ?? true, password, inviteCode]
  );

  const insertResult = result as any;
  const contestId = insertResult.insertId;

  if (random_mode && problem_count) {
    const [problems] = await pool.query(
      `SELECT id FROM problems ORDER BY RAND() LIMIT ?`,
      [problem_count]
    );
    const selectedProblems = problems as any[];

    for (let i = 0; i < selectedProblems.length; i++) {
      await pool.query(
        `INSERT INTO contest_problems (contest_id, problem_id, \`order\`) VALUES (?, ?, ?)`,
        [contestId, selectedProblems[i].id, i + 1]
      );
    }
  }

  const contest = await findById(contestId);
  return contest;
};

export const update = async (
  id: number,
  contestData: Partial<Contest>
): Promise<Contest | null> => {
  const fields: string[] = [];
  const values: any[] = [];

  Object.keys(contestData).forEach(key => {
    if (contestData[key as keyof Contest] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(contestData[key as keyof Contest]);
    }
  });

  if (fields.length === 0) {
    return findById(id);
  }

  values.push(id);
  await pool.query(
    `UPDATE contests SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return findById(id);
};

export const remove = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM contests WHERE id = ?', [id]);
};

export const join = async (
  contestId: number,
  userId: number,
  password?: string
): Promise<void> => {
  const contest = await findById(contestId);

  if (!contest) {
    throw new HttpError(404, 'Contest not found');
  }

  if (!contest.is_public && contest.password !== password) {
    throw new HttpError(403, 'Invalid contest password');
  }

  await pool.query(
    `INSERT IGNORE INTO contest_participants (contest_id, user_id, joined_at)
     VALUES (?, ?, NOW())`,
    [contestId, userId]
  );
};

export const getLeaderboard = async (contestId: number): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT
      u.id, u.username, u.avatar,
      COUNT(DISTINCT s.problem_id) as solved_count,
      SUM(s.runtime) as total_time
     FROM contest_participants cp
     JOIN users u ON cp.user_id = u.id
     LEFT JOIN submissions s ON s.user_id = u.id
       AND s.problem_id IN (SELECT problem_id FROM contest_problems WHERE contest_id = ?)
       AND s.status = 'Accepted'
     WHERE cp.contest_id = ?
     GROUP BY u.id
     ORDER BY solved_count DESC, total_time ASC`,
    [contestId, contestId]
  );

  return rows as any[];
};

export const addProblem = async (
  contestId: number,
  problemId: number,
  order?: number
): Promise<void> => {
  const [existing] = await pool.query(
    'SELECT * FROM contest_problems WHERE contest_id = ? AND problem_id = ?',
    [contestId, problemId]
  );

  if ((existing as any[]).length > 0) {
    throw new HttpError(400, 'Problem already added to contest');
  }

  if (order === undefined) {
    const [maxOrder] = await pool.query(
      'SELECT MAX(`order`) as max_order FROM contest_problems WHERE contest_id = ?',
      [contestId]
    );
    order = ((maxOrder as any[])[0].max_order || 0) + 1;
  }

  await pool.query(
    'INSERT INTO contest_problems (contest_id, problem_id, `order`) VALUES (?, ?, ?)',
    [contestId, problemId, order]
  );
};

export const removeProblem = async (
  contestId: number,
  problemId: number
): Promise<void> => {
  await pool.query(
    'DELETE FROM contest_problems WHERE contest_id = ? AND problem_id = ?',
    [contestId, problemId]
  );
};

export const updateProblemOrder = async (
  contestId: number,
  problemId: number,
  order: number
): Promise<void> => {
  await pool.query(
    'UPDATE contest_problems SET `order` = ? WHERE contest_id = ? AND problem_id = ?',
    [order, contestId, problemId]
  );
};

export const startContestSession = async (
  contestId: number,
  userId: number
): Promise<any> => {
  const contest = await findById(contestId);
  if (!contest) {
    throw new HttpError(404, '比赛不存在');
  }

  const [existing] = await pool.query(
    'SELECT * FROM contest_sessions WHERE contest_id = ? AND user_id = ?',
    [contestId, userId]
  );

  if ((existing as any[]).length > 0) {
    return getSessionWithAnswers(contestId, userId);
  }

  const now = new Date();
  const startTime = new Date(contest.start_time);
  const endTime = new Date(contest.end_time);

  if (now < startTime) {
    throw new HttpError(400, '比赛尚未开始');
  }

  if (now > endTime) {
    throw new HttpError(400, '比赛已结束');
  }

  await pool.query(
    `INSERT INTO contest_sessions (contest_id, user_id, started_at) VALUES (?, ?, NOW())`,
    [contestId, userId]
  );

  return getSessionWithAnswers(contestId, userId);
};

export const getSessionWithAnswers = async (
  contestId: number,
  userId: number
): Promise<any> => {
  const contest = await findById(contestId);
  
  const [sessions] = await pool.query(
    'SELECT * FROM contest_sessions WHERE contest_id = ? AND user_id = ?',
    [contestId, userId]
  );

  if ((sessions as any[]).length === 0) {
    return null;
  }

  const session = (sessions as any[])[0];

  const [answers] = await pool.query(
    `SELECT ca.*, s.status as submission_status 
     FROM contest_answers ca 
     LEFT JOIN submissions s ON ca.submission_id = s.id
     WHERE ca.session_id = ?`,
    [session.id]
  );

  return {
    ...session,
    contest,
    answers: answers as any[],
  };
};

export const saveContestAnswer = async (
  contestId: number,
  userId: number,
  problemId: number,
  code: string,
  language: string
): Promise<any> => {
  const [sessions] = await pool.query(
    'SELECT * FROM contest_sessions WHERE contest_id = ? AND user_id = ?',
    [contestId, userId]
  );

  if ((sessions as any[]).length === 0) {
    throw new HttpError(404, '未找到比赛会话');
  }

  const session = (sessions as any[])[0];

  if (session.submitted_at) {
    throw new HttpError(400, '比赛已结束，无法保存答案');
  }

  const [existing] = await pool.query(
    'SELECT * FROM contest_answers WHERE session_id = ? AND problem_id = ?',
    [session.id, problemId]
  );

  if ((existing as any[]).length > 0) {
    await pool.query(
      'UPDATE contest_answers SET code = ?, language = ?, updated_at = NOW() WHERE session_id = ? AND problem_id = ?',
      [code, language, session.id, problemId]
    );
  } else {
    await pool.query(
      'INSERT INTO contest_answers (session_id, problem_id, code, language, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [session.id, problemId, code, language]
    );
  }

  return getSessionWithAnswers(contestId, userId);
};

export const submitContestAnswer = async (
  contestId: number,
  userId: number,
  problemId: number,
  code: string,
  language: string
): Promise<any> => {
  const [sessions] = await pool.query(
    'SELECT * FROM contest_sessions WHERE contest_id = ? AND user_id = ?',
    [contestId, userId]
  );

  if ((sessions as any[]).length === 0) {
    throw new HttpError(404, '未找到比赛会话');
  }

  const session = (sessions as any[])[0];

  if (session.submitted_at) {
    throw new HttpError(400, '比赛已结束，无法提交答案');
  }

  const [result] = await pool.query(
    `INSERT INTO submissions (user_id, problem_id, code, language, status, created_at)
     VALUES (?, ?, ?, ?, 'Pending', NOW())`,
    [userId, problemId, code, language]
  );

  const submissionId = (result as any).insertId;

  processSubmission(submissionId);

  await pool.query(
    `INSERT INTO contest_answers (session_id, problem_id, code, language, submission_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE code = ?, language = ?, submission_id = ?, updated_at = NOW()`,
    [session.id, problemId, code, language, submissionId, code, language, submissionId]
  );

  return { submissionId };
};

export const finishContest = async (
  contestId: number,
  userId: number
): Promise<any> => {
  const [sessions] = await pool.query(
    'SELECT * FROM contest_sessions WHERE contest_id = ? AND user_id = ?',
    [contestId, userId]
  );

  if ((sessions as any[]).length === 0) {
    throw new HttpError(404, '未找到比赛会话');
  }

  const session = (sessions as any[])[0];

  if (session.submitted_at) {
    return getSessionWithAnswers(contestId, userId);
  }

  await pool.query(
    'UPDATE contest_sessions SET submitted_at = NOW() WHERE contest_id = ? AND user_id = ?',
    [contestId, userId]
  );

  return getSessionWithAnswers(contestId, userId);
};

export const getContestResults = async (
  contestId: number,
  userId: number
): Promise<any> => {
  const [sessions] = await pool.query(
    'SELECT * FROM contest_sessions WHERE contest_id = ? AND user_id = ?',
    [contestId, userId]
  );

  if ((sessions as any[]).length === 0) {
    return null;
  }

  return getSessionWithAnswers(contestId, userId);
};

export const getProblemStatus = async (
  contestId: number,
  userId: number,
  problemId: number
): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT s.status 
     FROM contest_sessions cs
     JOIN contest_answers ca ON cs.id = ca.session_id
     JOIN submissions s ON ca.submission_id = s.id
     WHERE cs.contest_id = ? AND cs.user_id = ? AND ca.problem_id = ?
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [contestId, userId, problemId]
  );

  if ((rows as any[]).length === 0) {
    return 'unsubmitted';
  }

  const status = (rows as any[])[0].status;
  if (status === 'Accepted') {
    return 'accepted';
  }
  return 'rejected';
};

export const findByInviteCode = async (inviteCode: string): Promise<any | null> => {
  const [rows] = await pool.query(
    `SELECT c.*, u.username as creator_name
     FROM contests c
     JOIN users u ON c.creator_id = u.id
     WHERE c.invite_code = ?`,
    [inviteCode]
  );

  const contests = rows as any[];
  if (contests.length === 0) return null;

  const contest = contests[0];

  const [problems] = await pool.query(
    `SELECT p.id, p.title, p.difficulty, cp.order
     FROM contest_problems cp
     JOIN problems p ON cp.problem_id = p.id
     WHERE cp.contest_id = ?
     ORDER BY cp.order`,
    [contest.id]
  );

  contest.problems = problems;
  return contest;
};

export const joinByInviteCode = async (
  inviteCode: string,
  userId: number
): Promise<any> => {
  const contest = await findByInviteCode(inviteCode);

  if (!contest) {
    throw new HttpError(404, '邀请链接无效或已过期');
  }

  const [existing] = await pool.query(
    'SELECT * FROM contest_participants WHERE contest_id = ? AND user_id = ?',
    [contest.id, userId]
  );

  if ((existing as any[]).length > 0) {
    return { contest, alreadyJoined: true };
  }

  await pool.query(
    `INSERT INTO contest_participants (contest_id, user_id, joined_at)
     VALUES (?, ?, NOW())`,
    [contest.id, userId]
  );

  return { contest, alreadyJoined: false };
};

export const getParticipants = async (
  contestId: number,
  creatorId: number
): Promise<any[]> => {
  const [contest] = await pool.query(
    'SELECT creator_id FROM contests WHERE id = ?',
    [contestId]
  );

  if ((contest as any[]).length === 0) {
    throw new HttpError(404, '比赛不存在');
  }

  if ((contest as any[])[0].creator_id !== creatorId) {
    throw new HttpError(403, '只有比赛创建者才能查看参与者');
  }

  const [participants] = await pool.query(
    `SELECT 
      u.id, u.username, u.avatar,
      cp.joined_at,
      cs.started_at,
      cs.submitted_at,
      (SELECT COUNT(*) FROM contest_answers ca 
       JOIN submissions s ON ca.submission_id = s.id 
       WHERE ca.session_id = cs.id AND s.status = 'Accepted') as accepted_count,
      (SELECT COUNT(*) FROM contest_answers ca 
       WHERE ca.session_id = cs.id) as attempted_count
     FROM contest_participants cp
     JOIN users u ON cp.user_id = u.id
     LEFT JOIN contest_sessions cs ON cs.contest_id = cp.contest_id AND cs.user_id = cp.user_id
     WHERE cp.contest_id = ?
     ORDER BY cp.joined_at DESC`,
    [contestId]
  );

  return participants as any[];
};

export const getParticipantSession = async (
  contestId: number,
  participantId: number,
  creatorId: number
): Promise<any> => {
  const [contest] = await pool.query(
    'SELECT creator_id FROM contests WHERE id = ?',
    [contestId]
  );

  if ((contest as any[]).length === 0) {
    throw new HttpError(404, '比赛不存在');
  }

  if ((contest as any[])[0].creator_id !== creatorId) {
    throw new HttpError(403, '只有比赛创建者才能查看作答记录');
  }

  return getSessionWithAnswers(contestId, participantId);
};

export const getContestStatistics = async (
  contestId: number,
  creatorId: number
): Promise<any> => {
  const [contest] = await pool.query(
    'SELECT creator_id FROM contests WHERE id = ?',
    [contestId]
  );

  if ((contest as any[]).length === 0) {
    throw new HttpError(404, '比赛不存在');
  }

  if ((contest as any[])[0].creator_id !== creatorId) {
    throw new HttpError(403, '只有比赛创建者才能查看统计数据');
  }

  const [problems] = await pool.query(
    `SELECT p.id, p.title, cp.order
     FROM contest_problems cp
     JOIN problems p ON cp.problem_id = p.id
     WHERE cp.contest_id = ?
     ORDER BY cp.order`,
    [contestId]
  );

  const problemList = problems as any[];
  const problemIds = problemList.map(p => p.id);

  let problemStats: any[] = [];
  
  if (problemIds.length > 0) {
    const placeholders = problemIds.map(() => '?').join(',');
    const [submissions] = await pool.query(
      `SELECT 
         ca.problem_id,
         COUNT(*) as total,
         SUM(CASE WHEN s.status = 'Accepted' THEN 1 ELSE 0 END) as accepted,
         SUM(CASE WHEN s.status = 'Wrong Answer' THEN 1 ELSE 0 END) as wrong_answer,
         SUM(CASE WHEN s.status = 'Time Limit Exceeded' THEN 1 ELSE 0 END) as tle,
         SUM(CASE WHEN s.status = 'Runtime Error' THEN 1 ELSE 0 END) as rte,
         SUM(CASE WHEN s.status IN ('Compilation Error', 'Compile Error') THEN 1 ELSE 0 END) as ce
       FROM contest_answers ca
       JOIN submissions s ON ca.submission_id = s.id
       WHERE ca.problem_id IN (${placeholders})
       GROUP BY ca.problem_id`,
      problemIds
    );

    const statsMap = new Map(
      (submissions as any[]).map(s => [s.problem_id, s])
    );

    problemStats = problemList.map(problem => {
      const stats = statsMap.get(problem.id) || {};
      return {
        id: problem.id,
        title: problem.title,
        order: problem.order,
        total: stats.total || 0,
        accepted: stats.accepted || 0,
        wrongAnswer: stats.wrong_answer || 0,
        tle: stats.tle || 0,
        rte: stats.rte || 0,
        ce: stats.ce || 0,
      };
    });
  }

  const [participantStats] = await pool.query(
    `SELECT 
       COUNT(*) as total_participants,
       SUM(CASE WHEN cs.started_at IS NOT NULL THEN 1 ELSE 0 END) as started,
       SUM(CASE WHEN cs.submitted_at IS NOT NULL THEN 1 ELSE 0 END) as submitted
     FROM contest_participants cp
     LEFT JOIN contest_sessions cs ON cs.contest_id = cp.contest_id AND cs.user_id = cp.user_id
     WHERE cp.contest_id = ?`,
    [contestId]
  );

  const [languageStats] = await pool.query(
    `SELECT 
       ca.language,
       COUNT(*) as count
     FROM contest_answers ca
     WHERE ca.session_id IN (
       SELECT id FROM contest_sessions WHERE contest_id = ?
     )
     GROUP BY ca.language
     ORDER BY count DESC`,
    [contestId]
  );

  return {
    problems: problemStats,
    participants: (participantStats as any[])[0],
    languages: languageStats,
  };
};
