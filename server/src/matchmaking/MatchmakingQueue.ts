import { matchMaker } from '@colyseus/core';
import { logger } from '../utils/logger';
import type { QueueEntry } from '../../../shared/src/types';

const _queue = new Map<string, QueueEntry & { addedAt: number }>();
let _timer: ReturnType<typeof setInterval> | null = null;

export const matchmakingQueue = {
  enqueue(e: QueueEntry) {
    if (_queue.has(e.playerId)) return;
    _queue.set(e.playerId, { ...e, addedAt: Date.now() });
    logger.info(`[Queue] ${e.playerId} queued (size=${_queue.size})`);
  },
  dequeue(id: string) { _queue.delete(id); },
  isQueued(id: string) { return _queue.has(id); },
  size() { return _queue.size; },
  start() {
    if (_timer) return;
    _timer = setInterval(() => _tryMatch().catch(e => logger.error('[Queue] match error', e)), 2000);
    logger.info('[Queue] started');
  },
  stop() { if (_timer) { clearInterval(_timer); _timer = null; } },
};

async function _tryMatch() {
  if (_queue.size < 2) return;
  const players = [..._queue.values()].sort((a, b) => a.addedAt - b.addedAt);
  for (let i = 0; i < players.length; i++) {
    const p1 = players[i];
    const age = (Date.now() - p1.addedAt) / 1000;
    const window = 100 + Math.floor(age / 5) * 50;
    for (let j = i + 1; j < players.length; j++) {
      const p2 = players[j];
      if (Math.abs(p1.mmr - p2.mmr) <= window) {
        _queue.delete(p1.playerId); _queue.delete(p2.playerId);
        try {
          const room = await matchMaker.createRoom('arcade', {});
          await matchMaker.joinById(room.roomId, { playerId: p1.playerId, displayName: p1.displayName, mmr: p1.mmr });
          await matchMaker.joinById(room.roomId, { playerId: p2.playerId, displayName: p2.displayName, mmr: p2.mmr });
          logger.info(`[Queue] match created: ${room.roomId}`);
        } catch (e) { _queue.set(p1.playerId, p1); _queue.set(p2.playerId, p2); logger.error('[Queue] room error', e); }
        return;
      }
    }
  }
}
