import { FastifyInstance } from 'fastify';
import { getPrisma } from '../db/prisma';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    let db = false;
    try { await getPrisma().$queryRaw`SELECT 1`; db = true; } catch {}
    reply.status(db ? 200 : 503).send({ status: db ? 'ok' : 'degraded', uptime: process.uptime(), db });
  });
  app.get('/ping', async (_req, reply) => reply.send({ pong: true }));
}
