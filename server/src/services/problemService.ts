import { pool } from '../config/database';
import { CreateProblemPayload, Problem, TestCase } from '../types';

interface FindAllOptions {
  page: number;
  limit: number;
  difficulty?: string;
  search?: string;
  userId?: number;
  tagName?: string;
}

export const findAll = async (
  options: FindAllOptions
): Promise<{ problems: any[]; total: number }> => {
  const { page, limit, difficulty, search, userId, tagName } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE p.is_published = true AND (p.is_public = true';
  const params: any[] = [];

  if (userId) {
    whereClause += ' OR p.creator_id = ?';
    params.push(userId);
  }
  whereClause += ')';

  if (difficulty) {
    whereClause += ' AND p.difficulty = ?';
    params.push(difficulty);
  }

  if (search) {
    whereClause += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  let joinClause = '';
  if (tagName) {
    joinClause = ' JOIN problem_tags pt ON p.id = pt.problem_id JOIN tags t ON pt.tag_id = t.id';
    whereClause += ' AND t.name = ?';
    params.push(tagName);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) as total FROM problems p ${joinClause} ${whereClause}`,
    params
  );

  const [problemRows] = await pool.query(
    `SELECT DISTINCT p.id, p.title, p.slug, p.difficulty, p.acceptance, p.submission_count, p.created_at, p.is_public, p.creator_id
     FROM problems p ${joinClause}
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    problems: problemRows as any[],
    total: (countRows as any[])[0].total,
  };
};

export const findById = async (id: number, userId?: number): Promise<Problem | null> => {
  let query = `SELECT * FROM problems WHERE id = ? AND is_published = true`;
  const params: any[] = [id];

  if (userId) {
    query += ` AND (is_public = true OR creator_id = ?)`;
    params.push(userId);
  } else {
    query += ` AND is_public = true`;
  }

  const [rows] = await pool.query(query, params);
  const problems = (rows as Array<Problem & { sample_cases?: string | null }>).map((problem) => ({
    ...problem,
    sample_cases:
      typeof problem.sample_cases === 'string' && problem.sample_cases
        ? JSON.parse(problem.sample_cases)
        : null,
  }));
  return problems.length > 0 ? problems[0] : null;
};

export const findByIdRaw = async (id: number): Promise<Problem | null> => {
  const [rows] = await pool.query(`SELECT * FROM problems WHERE id = ?`, [id]);
  const problems = (rows as Array<Problem & { sample_cases?: string | null }>).map((problem) => ({
    ...problem,
    sample_cases:
      typeof problem.sample_cases === 'string' && problem.sample_cases
        ? JSON.parse(problem.sample_cases)
        : null,
  }));
  return problems.length > 0 ? problems[0] : null;
};

export const canEdit = async (problemId: number, userId: number): Promise<boolean> => {
  const problem = await findByIdRaw(problemId);
  if (!problem) return false;
  return problem.creator_id === userId;
};

export const create = async (problemData: CreateProblemPayload, creatorId?: number): Promise<Problem> => {
  const {
    title,
    slug,
    description,
    input_description,
    output_description,
    difficulty,
    time_limit,
    memory_limit,
    sample_input,
    sample_output,
    sample_cases,
    hints,
    solution,
    generator_code,
    generator_language,
    solution_code,
    solution_language,
    source,
    is_public = true,
    category_id,
    tag_ids,
    test_cases = [],
  } = problemData;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO problems
       (title, slug, description, input_description, output_description, difficulty, time_limit, memory_limit,
        sample_input, sample_output, sample_cases, hints, solution, generator_code, generator_language, solution_code, solution_language, source, creator_id, is_public, category_id, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
      [
        title,
        slug || title?.toLowerCase().replace(/\s+/g, '-'),
        description,
        input_description || '',
        output_description || '',
        difficulty,
        time_limit || 1000,
        memory_limit || 256,
        sample_input || '',
        sample_output || '',
        sample_cases?.length ? JSON.stringify(sample_cases) : null,
        hints,
        solution,
        generator_code,
        generator_language,
        solution_code,
        solution_language,
        source,
        creatorId || null,
        is_public,
        category_id || null,
      ]
    );

    const insertResult = result as any;
    const problemId = insertResult.insertId as number;
    const validTestCases = test_cases.filter((item) => item.input && item.expected_output);

    if (validTestCases.length > 0) {
      const values = validTestCases.map((tc, index) => [
        problemId,
        tc.input,
        tc.expected_output,
        tc.is_sample || false,
        tc.order || index + 1,
      ]);

      const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
      await connection.query(
        `INSERT INTO test_cases (problem_id, input, expected_output, is_sample, \`order\`) VALUES ${placeholders}`,
        values.flat()
      );
    }

    if (tag_ids && tag_ids.length > 0) {
      const tagValues = tag_ids.map((tagId: number) => [problemId, tagId]);
      const tagPlaceholders = tagValues.map(() => '(?, ?)').join(', ');
      await connection.query(
        `INSERT INTO problem_tags (problem_id, tag_id) VALUES ${tagPlaceholders}`,
        tagValues.flat()
      );
    }

    await connection.commit();
    const problem = await findById(problemId, creatorId);
    return problem!;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const update = async (
  id: number,
  problemData: Partial<Problem> & { tag_ids?: number[] }
): Promise<Problem | null> => {
  const { tag_ids, ...data } = problemData;
  const fields: string[] = [];
  const values: any[] = [];

  Object.keys(data).forEach(key => {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${key} = ?`);
      if (key === 'sample_cases') {
        values.push(JSON.stringify(data[key as keyof typeof data] || null));
      } else {
        values.push(data[key as keyof typeof data]);
      }
    }
  });

  if (fields.length > 0) {
    values.push(id);
    await pool.query(
      `UPDATE problems SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
  }

  if (tag_ids !== undefined) {
    await pool.query('DELETE FROM problem_tags WHERE problem_id = ?', [id]);
    if (tag_ids.length > 0) {
      const tagValues = tag_ids.map((tagId) => [id, tagId]);
      const tagPlaceholders = tagValues.map(() => '(?, ?)').join(', ');
      await pool.query(
        `INSERT INTO problem_tags (problem_id, tag_id) VALUES ${tagPlaceholders}`,
        tagValues.flat()
      );
    }
  }

  return findById(id);
};

export const remove = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM problems WHERE id = ?', [id]);
};

export const findTestCases = async (problemId: number): Promise<TestCase[]> => {
  const [rows] = await pool.query(
    'SELECT * FROM test_cases WHERE problem_id = ? ORDER BY `order`',
    [problemId]
  );
  return rows as TestCase[];
};

export const addTestCase = async (testCaseData: Partial<TestCase>): Promise<TestCase> => {
  const { problem_id, input, expected_output, is_sample, order } = testCaseData;

  const [result] = await pool.query(
    `INSERT INTO test_cases (problem_id, input, expected_output, is_sample, \`order\`)
     VALUES (?, ?, ?, ?, ?)`,
    [problem_id, input, expected_output, is_sample || false, order || 0]
  );

  const insertResult = result as any;
  return {
    id: insertResult.insertId,
    problem_id: problem_id!,
    input: input || '',
    expected_output: expected_output || '',
    is_sample: is_sample || false,
    order: order || 0,
  } as TestCase;
};

export const addTestCasesBatch = async (
  problemId: number,
  testCases: Array<{ input: string; expected_output: string }>
): Promise<number> => {
  if (testCases.length === 0) return 0;

  const values = testCases.map((tc, index) => [
    problemId,
    tc.input,
    tc.expected_output,
    false,
    index + 1,
  ]);

  const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const flatValues = values.flat();

  const [result] = await pool.query(
    `INSERT INTO test_cases (problem_id, input, expected_output, is_sample, \`order\`) VALUES ${placeholders}`,
    flatValues
  );

  const insertResult = result as any;
  return insertResult.affectedRows;
};

export const clearTestCases = async (problemId: number): Promise<void> => {
  await pool.query('DELETE FROM test_cases WHERE problem_id = ?', [problemId]);
};

export const updateTestCase = async (
  testCaseId: number,
  data: { input: string; expected_output: string }
): Promise<TestCase | null> => {
  await pool.query(
    'UPDATE test_cases SET input = ?, expected_output = ? WHERE id = ?',
    [data.input, data.expected_output, testCaseId]
  );

  const [rows] = await pool.query('SELECT * FROM test_cases WHERE id = ?', [testCaseId]);
  return (rows as TestCase[])[0] || null;
};

export const deleteTestCase = async (testCaseId: number): Promise<void> => {
  await pool.query('DELETE FROM test_cases WHERE id = ?', [testCaseId]);
};

export const saveCodeDraft = async (
  userId: number,
  problemId: number,
  code: string,
  language: string
): Promise<void> => {
  await pool.query(
    `INSERT INTO code_drafts (user_id, problem_id, code, language, updated_at)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE code = ?, language = ?, updated_at = NOW()`,
    [userId, problemId, code, language, code, language]
  );
};

export const getCodeDraft = async (
  userId: number,
  problemId: number
): Promise<{ code: string; language: string } | null> => {
  const [rows] = await pool.query(
    'SELECT code, language FROM code_drafts WHERE user_id = ? AND problem_id = ?',
    [userId, problemId]
  );

  const drafts = rows as any[];
  if (drafts.length === 0) return null;

  return {
    code: drafts[0].code,
    language: drafts[0].language,
  };
};
