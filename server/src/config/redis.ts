import Redis from 'ioredis';
import { config } from './index';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('Redis connection established successfully');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

export async function testRedisConnection(): Promise<void> {
  try {
    await redis.ping();
    console.log('Redis ping successful');
  } catch (error) {
    console.error('Redis connection failed:', error);
    throw error;
  }
}
