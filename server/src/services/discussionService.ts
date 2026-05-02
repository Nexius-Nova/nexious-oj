import { pool } from '../config/database';
import { Discussion, Comment } from '../types';
import { HttpError } from '../middlewares/errorHandler';

interface FindAllOptions {
  page: number;
  limit: number;
  problemId?: number;
  type?: string;
}

export const findAll = async (
  options: FindAllOptions
): Promise<{ discussions: any[]; total: number }> => {
  const { page, limit, problemId, type } = options;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params: any[] = [];

  if (problemId) {
    whereClause += ' AND d.problem_id = ?';
    params.push(problemId);
  }

  if (type) {
    whereClause += ' AND d.type = ?';
    params.push(type);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM discussions d WHERE ${whereClause}`,
    params
  );

  const [discussionRows] = await pool.query(
    `SELECT d.*, u.username, u.avatar, p.title as problem_title
     FROM discussions d
     JOIN users u ON d.user_id = u.id
     LEFT JOIN problems p ON d.problem_id = p.id
     WHERE ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    discussions: discussionRows as any[],
    total: (countRows as any[])[0].total,
  };
};

export const findById = async (id: number): Promise<any | null> => {
  const [rows] = await pool.query(
    `SELECT d.*, u.username, u.avatar, p.title as problem_title
     FROM discussions d
     JOIN users u ON d.user_id = u.id
     LEFT JOIN problems p ON d.problem_id = p.id
     WHERE d.id = ?`,
    [id]
  );
  const discussions = rows as any[];

  if (discussions.length === 0) return null;

  const discussion = discussions[0];

  const [comments] = await pool.query(
    `SELECT c.*, u.username, u.avatar
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.discussion_id = ?
     ORDER BY c.created_at ASC`,
    [id]
  );

  discussion.comments = comments;
  return discussion;
};

export const create = async (data: Partial<Discussion>): Promise<Discussion> => {
  const { problem_id, user_id, title, content, type } = data;

  const [result] = await pool.query(
    `INSERT INTO discussions (problem_id, user_id, title, content, type, likes_count)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [problem_id, user_id, title, content, type || 'discussion']
  );

  const insertResult = result as any;
  const discussion = await findById(insertResult.insertId);
  return discussion;
};

export const update = async (
  id: number,
  userId: number,
  data: Partial<Discussion>
): Promise<Discussion | null> => {
  const discussion = await findById(id);

  if (!discussion || discussion.user_id !== userId) {
    throw new HttpError(403, 'Not authorized to update this discussion');
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (data.title) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.content) {
    fields.push('content = ?');
    values.push(data.content);
  }

  if (fields.length === 0) {
    return discussion;
  }

  values.push(id);
  await pool.query(
    `UPDATE discussions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values
  );

  return findById(id);
};

export const remove = async (id: number, userId: number): Promise<void> => {
  const discussion = await findById(id);

  if (!discussion || discussion.user_id !== userId) {
    throw new HttpError(403, 'Not authorized to delete this discussion');
  }

  await pool.query('DELETE FROM comments WHERE discussion_id = ?', [id]);
  await pool.query('DELETE FROM discussions WHERE id = ?', [id]);
};

export const like = async (id: number): Promise<void> => {
  await pool.query(
    'UPDATE discussions SET likes_count = likes_count + 1 WHERE id = ?',
    [id]
  );
};

export const addComment = async (data: Partial<Comment>): Promise<Comment> => {
  const { discussion_id, user_id, content, parent_id } = data;

  const [result] = await pool.query(
    `INSERT INTO comments (discussion_id, user_id, parent_id, content)
     VALUES (?, ?, ?, ?)`,
    [discussion_id, user_id, parent_id || null, content]
  );

  const insertResult = result as any;

  const [rows] = await pool.query(
    `SELECT c.*, u.username, u.avatar
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.id = ?`,
    [insertResult.insertId]
  );

  return (rows as any[])[0];
};
