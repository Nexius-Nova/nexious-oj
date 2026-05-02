import { pool } from '../config/database';
import { User } from '../types';

export const findByEmail = async (email: string): Promise<User | null> => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

export const findByUsername = async (username: string): Promise<User | null> => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE username = ?',
    [username]
  );
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

export const findByEmailOrUsername = async (
  email: string,
  username: string
): Promise<User | null> => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? OR username = ?',
    [email, username]
  );
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

export const findById = async (id: number): Promise<User | null> => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
};

export const create = async (userData: {
  username: string;
  email: string;
  password: string;
}): Promise<User> => {
  const [result] = await pool.query(
    'INSERT INTO users (username, email, password, role, rating, `rank`) VALUES (?, ?, ?, ?, ?, ?)',
    [userData.username, userData.email, userData.password, 'user', 0, 'Newbie']
  );

  const insertResult = result as any;
  return {
    id: insertResult.insertId,
    username: userData.username,
    email: userData.email,
    password: userData.password,
    ai_api_key: null,
    ai_base_url: null,
    ai_model: null,
    avatar: null,
    bio: null,
    rating: 0,
    rank: 'Newbie',
    role: 'user',
    created_at: new Date(),
    updated_at: new Date(),
  } as User;
};

export const update = async (
  id: number,
  userData: Partial<User>
): Promise<User> => {
  const fields: string[] = [];
  const values: any[] = [];

  if (userData.avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(userData.avatar);
  }
  if (userData.bio !== undefined) {
    fields.push('bio = ?');
    values.push(userData.bio);
  }
  if (userData.ai_api_key !== undefined) {
    fields.push('ai_api_key = ?');
    values.push(userData.ai_api_key);
  }
  if (userData.ai_base_url !== undefined) {
    fields.push('ai_base_url = ?');
    values.push(userData.ai_base_url);
  }
  if (userData.ai_model !== undefined) {
    fields.push('ai_model = ?');
    values.push(userData.ai_model);
  }

  if (fields.length === 0) {
    const user = await findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  values.push(id);
  await pool.query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values
  );

  const user = await findById(id);
  if (!user) throw new Error('User not found');
  return user;
};
