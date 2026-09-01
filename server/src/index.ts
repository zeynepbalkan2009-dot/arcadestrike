import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../.env') });
config({ path: path.resolve(__dirname, '../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import { logger } from './utils/logger';
import { initRedis, disconnectRedis } from './infra/redis';
import { disconnectPrisma } from './db/prisma';
import { healthRoutes } from './routes/health';
import { matchmakingRoutes } from './routes/matchmaking';
import { ArcadeRoom } from './game/ArcadeRoom';
import { matchmakingQueue } from './matchmaking/MatchmakingQueue';
import { withdrawalQueue } from './withdrawals/WithdrawalQueue';

const PORT = parseInt(process.env.PORT ?? '10000', 10);

async function main() {
  if (!process.env.DATABASE_URL) {
    logger.warn('[Boot] DATABASE_URL not set — DB features disabled');
  }

  await initRedis();

  const app = Fastify({ logger: false, trustProxy: true });
  await app.register(cors, { origin: process.env.CLIENT_ORIGIN ?? '*', credentials: true });
  await app.register(healthRoutes);
  await app.register(matchmakingRoutes);

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: app.server }),
  });
  gameServer.define('arcade', ArcadeRoom);

  if (process.env.NODE_ENV !== 'production') {
    app.register(monitor as any);
  }

  matchmakingQueue.start();
  if (process.env.DATABASE_URL) withdrawalQueue.start();

  await app.listen({ port: PORT, host: '0.0.0.0' });
  await gameServer.listen(PORT);

  logger.info('══════════════════════════════════════');
  logger.info('  ArcadeStrike Server ONLINE');
  logger.info('  WS   : ws://0.0.0.0:' + PORT);
  logger.info('  HTTP : http://0.0.0.0:' + PORT);
  logger.info('  Health: http://0.0.0.0:' + PORT + '/health');
  logger.info('══════════════════════════════════════');
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (r) => logger.error('[Boot] unhandledRejection: ' + String(r)));
process.on('uncaughtException',  (e) => { logger.error('[Boot] uncaughtException: ' + String(e)); process.exit(1); });

async function shutdown() {
  logger.info('[Boot] shutting down...');
  matchmakingQueue.stop();
  withdrawalQueue.stop();
  await disconnectRedis();
  await disconnectPrisma();
  process.exit(0);
}

main().catch(e => { logger.error('[Boot] fatal: ' + String(e)); process.exit(1); });
