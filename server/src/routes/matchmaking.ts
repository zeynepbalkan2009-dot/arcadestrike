import { FastifyInstance } from 'fastify';
import { matchmakingQueue } from '../matchmaking/MatchmakingQueue';

export async function matchmakingRoutes(app: FastifyInstance) {
  app.post('/api/matchmaking/join', async (req, reply) => {
    const { playerId, displayName, mmr } = (req.body as any) ?? {};
    if (!playerId) return reply.status(400).send({ error: 'playerId required' });
    matchmakingQueue.enqueue({ playerId, displayName: displayName ?? playerId, mmr: mmr ?? 1000, enqueuedAt: Date.now() });
    reply.send({ status: 'queued', queueSize: matchmakingQueue.size() });
  });
  app.post('/api/matchmaking/leave', async (req, reply) => {
    const { playerId } = (req.body as any) ?? {};
    if (playerId) matchmakingQueue.dequeue(playerId);
    reply.send({ status: 'left' });
  });
  app.get('/api/matchmaking/status', async (req, reply) => {
    reply.send({ queueSize: matchmakingQueue.size() });
  });
}
