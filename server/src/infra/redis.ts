import IORedis from 'ioredis';
import { logger } from '../utils/logger';
let _redis: IORedis | null = null;
export function getRedis() { return _redis; }
export async function initRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) { logger.warn('[Redis] REDIS_URL not set'); return; }
  try {
    _redis = new IORedis(url, { maxRetriesPerRequest: 1, lazyConnect: true, connectTimeout: 4000,
      retryStrategy: (t) => t > 2 ? null : t * 500 });
    await _redis.connect();
    logger.info('[Redis] connected');
  } catch { logger.warn('[Redis] unavailable'); _redis = null; }
}
export async function disconnectRedis() { if (_redis) { await _redis.quit().catch(() => {}); _redis = null; } }
