import mysql from 'mysql2/promise';
import { config } from './index';
import { randomUUID } from 'crypto';

function generateInviteCode(): string {
  return randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
}

export const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established successfully');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export async function ensureProblemSchema(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'problems'
         AND COLUMN_NAME IN ('input_description', 'output_description', 'sample_cases', 'creator_id', 'is_public')`,
      [config.database.database]
    );

    const existingColumns = new Set(
      (columns as Array<{ COLUMN_NAME: string }>).map((item) => item.COLUMN_NAME)
    );

    if (!existingColumns.has('input_description')) {
      await connection.query(
        `ALTER TABLE problems
         ADD COLUMN input_description TEXT NULL AFTER description`
      );
      await connection.query(
        `UPDATE problems
         SET input_description = ''
         WHERE input_description IS NULL`
      );
    }

    if (!existingColumns.has('output_description')) {
      await connection.query(
        `ALTER TABLE problems
         ADD COLUMN output_description TEXT NULL AFTER input_description`
      );
      await connection.query(
        `UPDATE problems
         SET output_description = ''
         WHERE output_description IS NULL`
      );
    }

    if (!existingColumns.has('sample_cases')) {
      await connection.query(
        `ALTER TABLE problems
         ADD COLUMN sample_cases TEXT NULL AFTER sample_output`
      );
    }

    if (!existingColumns.has('creator_id')) {
      await connection.query(
        `ALTER TABLE problems
         ADD COLUMN creator_id INT NULL AFTER source`
      );
      await connection.query(
        `ALTER TABLE problems
         ADD CONSTRAINT fk_problem_creator
         FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL`
      );
    }

    if (!existingColumns.has('is_public')) {
      await connection.query(
        `ALTER TABLE problems
         ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true AFTER creator_id`
      );
    }
  } finally {
    connection.release();
  }
}

export async function ensureUserSchema(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('ai_api_key', 'ai_base_url', 'ai_model')`,
      [config.database.database]
    );

    const existingColumns = new Set(
      (columns as Array<{ COLUMN_NAME: string }>).map((item) => item.COLUMN_NAME)
    );

    if (!existingColumns.has('ai_api_key')) {
      await connection.query(
        `ALTER TABLE users
         ADD COLUMN ai_api_key VARCHAR(255) NULL AFTER password`
      );
    }

    if (!existingColumns.has('ai_base_url')) {
      await connection.query(
        `ALTER TABLE users
         ADD COLUMN ai_base_url VARCHAR(255) NULL AFTER ai_api_key`
      );
    }

    if (!existingColumns.has('ai_model')) {
      await connection.query(
        `ALTER TABLE users
         ADD COLUMN ai_model VARCHAR(100) NULL AFTER ai_base_url`
      );
    }
  } finally {
    connection.release();
  }
}

export async function ensureCategoryTagSchema(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    const [tables] = await connection.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME IN ('categories', 'tags', 'problem_tags')`,
      [config.database.database]
    );

    const existingTables = new Set(
      (tables as Array<{ TABLE_NAME: string }>).map((item) => item.TABLE_NAME)
    );

    if (!existingTables.has('categories')) {
      await connection.query(`
        CREATE TABLE categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          slug VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          parent_id INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!existingTables.has('tags')) {
      await connection.query(`
        CREATE TABLE tags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          slug VARCHAR(50) NOT NULL UNIQUE,
          color VARCHAR(20) DEFAULT '#6B7280',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!existingTables.has('problem_tags')) {
      await connection.query(`
        CREATE TABLE problem_tags (
          problem_id INT NOT NULL,
          tag_id INT NOT NULL,
          PRIMARY KEY (problem_id, tag_id),
          FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    const [problemColumns] = await connection.query(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'problems'
         AND COLUMN_NAME = 'category_id'`,
      [config.database.database]
    );

    if ((problemColumns as any[]).length === 0) {
      await connection.query(
        `ALTER TABLE problems
         ADD COLUMN category_id INT NULL`,
      );
      await connection.query(
        `ALTER TABLE problems
         ADD CONSTRAINT fk_problem_category
         FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL`
      );
    }
  } finally {
    connection.release();
  }
}

export async function ensureTestCasesSchema(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'test_cases'
         AND COLUMN_NAME IN ('input', 'expected_output')`,
      [config.database.database]
    );

    const columnInfo = new Map(
      (columns as Array<{ COLUMN_NAME: string; DATA_TYPE: string; CHARACTER_MAXIMUM_LENGTH: number | null }>).map(
        (item) => [item.COLUMN_NAME, { type: item.DATA_TYPE, maxLength: item.CHARACTER_MAXIMUM_LENGTH }]
      )
    );

    const inputInfo = columnInfo.get('input');
    const outputInfo = columnInfo.get('expected_output');

    const needsAlter =
      (inputInfo && inputInfo.type !== 'longtext' && (inputInfo.maxLength === null || inputInfo.maxLength < 65535)) ||
      (outputInfo && outputInfo.type !== 'longtext' && (outputInfo.maxLength === null || outputInfo.maxLength < 65535));

    if (needsAlter) {
      console.log('Upgrading test_cases input/expected_output columns to LONGTEXT...');
      await connection.query(
        `ALTER TABLE test_cases
         MODIFY COLUMN input LONGTEXT NOT NULL,
         MODIFY COLUMN expected_output LONGTEXT NOT NULL`
      );
      console.log('test_cases columns upgraded successfully');
    }
  } catch (error) {
    console.warn('Failed to check/upgrade test_cases schema:', error);
  } finally {
    connection.release();
  }
}

export async function ensureContestSchema(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'contests' AND COLUMN_NAME IN ('duration', 'invite_code')`,
      [config.database.database]
    );

    const existingColumns = new Set(
      (columns as any[]).map((item) => item.COLUMN_NAME)
    );

    if (!existingColumns.has('duration')) {
      await connection.query(
        `ALTER TABLE contests ADD COLUMN duration INT DEFAULT 180 AFTER end_time`
      );
      console.log('Added duration column to contests table');
    }

    if (!existingColumns.has('invite_code')) {
      await connection.query(
        `ALTER TABLE contests ADD COLUMN invite_code VARCHAR(32) NULL UNIQUE AFTER password`
      );
      console.log('Added invite_code column to contests table');
    }

    const [contestsWithoutCode] = await connection.query(
      `SELECT id FROM contests WHERE invite_code IS NULL`
    );

    for (const contest of contestsWithoutCode as any[]) {
      const inviteCode = generateInviteCode();
      await connection.query(
        `UPDATE contests SET invite_code = ? WHERE id = ?`,
        [inviteCode, contest.id]
      );
    }

    if ((contestsWithoutCode as any[]).length > 0) {
      console.log(`Generated invite codes for ${(contestsWithoutCode as any[]).length} existing contests`);
    }

    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('contest_sessions', 'contest_answers')`,
      [config.database.database]
    );

    const existingTables = new Set(
      (tables as Array<{ TABLE_NAME: string }>).map((item) => item.TABLE_NAME)
    );

    if (!existingTables.has('contest_sessions')) {
      await connection.query(`
        CREATE TABLE contest_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          contest_id INT NOT NULL,
          user_id INT NOT NULL,
          started_at DATETIME NOT NULL,
          submitted_at DATETIME NULL,
          UNIQUE KEY unique_contest_user (contest_id, user_id),
          FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created contest_sessions table');
    }

    if (!existingTables.has('contest_answers')) {
      await connection.query(`
        CREATE TABLE contest_answers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          session_id INT NOT NULL,
          problem_id INT NOT NULL,
          code LONGTEXT NOT NULL,
          language VARCHAR(50) NOT NULL,
          submission_id INT NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          UNIQUE KEY unique_session_problem (session_id, problem_id),
          FOREIGN KEY (session_id) REFERENCES contest_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
          FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created contest_answers table');
    }

    const [codeDraftsTable] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'code_drafts'`,
      [config.database.database]
    );

    if ((codeDraftsTable as any[]).length === 0) {
      await connection.query(`
        CREATE TABLE code_drafts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          problem_id INT NOT NULL,
          code LONGTEXT NOT NULL,
          language VARCHAR(50) NOT NULL DEFAULT 'cpp',
          updated_at DATETIME NOT NULL,
          UNIQUE KEY unique_user_problem (user_id, problem_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Created code_drafts table');
    }
  } catch (error) {
    console.warn('Failed to ensure contest schema:', error);
  } finally {
    connection.release();
  }
}

export async function ensureIndexes(): Promise<void> {
  const connection = await pool.getConnection();

  try {
    const indexes = [
      { table: 'submissions', name: 'idx_submissions_user_problem', columns: '(user_id, problem_id)' },
      { table: 'submissions', name: 'idx_submissions_status', columns: '(status)' },
      { table: 'submissions', name: 'idx_submissions_created_at', columns: '(created_at)' },
      { table: 'problems', name: 'idx_problems_difficulty', columns: '(difficulty)' },
      { table: 'contests', name: 'idx_contests_start_time', columns: '(start_time)' },
      { table: 'contests', name: 'idx_contests_end_time', columns: '(end_time)' },
      { table: 'test_cases', name: 'idx_test_cases_problem_id', columns: '(problem_id)' },
      { table: 'contest_participants', name: 'idx_contest_participants_contest_user', columns: '(contest_id, user_id)' },
    ];

    for (const index of indexes) {
      try {
        const [existing] = await connection.query(
          `SELECT INDEX_NAME FROM information_schema.STATISTICS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
          [config.database.database, index.table, index.name]
        );

        if ((existing as any[]).length === 0) {
          await connection.query(
            `ALTER TABLE ${index.table} ADD INDEX ${index.name} ${index.columns}`
          );
          console.log(`Created index ${index.name} on ${index.table}`);
        }
      } catch (error) {
        console.warn(`Failed to create index ${index.name}:`, error);
      }
    }
  } finally {
    connection.release();
  }
}
