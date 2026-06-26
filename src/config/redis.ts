import { createClient, RedisClientType } from 'redis';   // named import
import { logger } from '../utils/logger';

let redisClient: RedisClientType;   // now the type is correctly inferred

export const connectRedis = async (): Promise<void> => {
  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Basic options
    const options: any = { url };

    // Enable TLS for rediss:// URLs
    if (url.startsWith('rediss://')) {
      options.tls = {
        // For production with a valid CA, use an empty object:
        // {}
        // For self-signed certificates (testing only):
        rejectUnauthorized: false,
      };
    }

    // Create the client using the named import
    redisClient = createClient(options);

    await redisClient.connect();
    logger.info('✅ Redis connected successfully');

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
    });
  } catch (error) {
    // Log the full error for debugging
    logger.error('Redis connection error:', error);
    logger.warn('⚠️ Redis connection failed, using in-memory cache');
  }
};

export const getRedisClient = () => redisClient;