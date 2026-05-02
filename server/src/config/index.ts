export const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Gmgz.513X',
    database: process.env.DB_NAME || 'nexious_oj',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'),
  },

  ai: {
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },
};

export function validateConfig(): void {
  const warnings: string[] = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    warnings.push('JWT_SECRET is using default value. Please set a strong random secret in environment variables.');
  }

  if (config.jwt.secret.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for security.');
  }

  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'Gmgz.513X') {
    warnings.push('Database password is using default value. Please set a secure password.');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Security Warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('\n');
  }
}
