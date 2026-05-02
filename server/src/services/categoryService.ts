import { pool } from '../config/database';

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
  created_at: Date;
}

export const getAllTags = async (): Promise<Tag[]> => {
  const [rows] = await pool.query('SELECT * FROM tags ORDER BY name');
  return rows as Tag[];
};

export const getTagById = async (id: number): Promise<Tag | null> => {
  const [rows] = await pool.query('SELECT * FROM tags WHERE id = ?', [id]);
  const tags = rows as Tag[];
  return tags.length > 0 ? tags[0] : null;
};

export const getTagByName = async (name: string): Promise<Tag | null> => {
  const [rows] = await pool.query('SELECT * FROM tags WHERE name = ?', [name]);
  const tags = rows as Tag[];
  return tags.length > 0 ? tags[0] : null;
};

export const createTag = async (data: Partial<Tag>): Promise<Tag> => {
  const { name, slug, color } = data;
  const [result] = await pool.query(
    'INSERT INTO tags (name, slug, color) VALUES (?, ?, ?)',
    [name, slug, color || '#6B7280']
  );
  const insertResult = result as any;
  return (await getTagById(insertResult.insertId))!;
};

export const getProblemTags = async (problemId: number): Promise<Tag[]> => {
  const [rows] = await pool.query(
    `SELECT t.* FROM tags t
     JOIN problem_tags pt ON t.id = pt.tag_id
     WHERE pt.problem_id = ?`,
    [problemId]
  );
  return rows as Tag[];
};

export const setProblemTags = async (problemId: number, tagIds: number[]): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.query('DELETE FROM problem_tags WHERE problem_id = ?', [problemId]);
    if (tagIds.length > 0) {
      const values = tagIds.map((tagId) => [problemId, tagId]);
      await connection.query(
        'INSERT INTO problem_tags (problem_id, tag_id) VALUES ?',
        [values]
      );
    }
  } finally {
    connection.release();
  }
};

export const getProblemsByTag = async (tagId: number): Promise<number[]> => {
  const [rows] = await pool.query(
    'SELECT problem_id FROM problem_tags WHERE tag_id = ?',
    [tagId]
  );
  return (rows as any[]).map((r) => r.problem_id);
};
