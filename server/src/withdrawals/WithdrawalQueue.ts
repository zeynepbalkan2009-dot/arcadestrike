import { logger } from '../utils/logger';
import { getPrisma } from '../db/prisma';

let _timer: ReturnType<typeof setInterval> | null = null;
let _busy = false;

export const withdrawalQueue = {
  start() {
    if (_timer) return;
    _timer = setInterval(() => { if (!_busy) _poll().catch(e => logger.error('[WithdrawalQueue] error', e)); }, 30000);
    logger.info('[WithdrawalQueue] started');
  },
  stop() { if (_timer) { clearInterval(_timer); _timer = null; } },
};

async function _poll() {
  _busy = true;
  try {
    const prisma = getPrisma();
    const items = await prisma.withdrawal.findMany({
      where: { status: { in: ['QUEUED', 'RETRYING'] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] },
      take: 5,
    });
    if (!items.length) return;
    logger.info(`[WithdrawalQueue] processing ${items.length} items`);
    for (const w of items) {
      if (!process.env.RPC_URL) {
        await prisma.withdrawal.update({ where: { id: w.id }, data: { status: 'FAILED', lastError: 'RPC_URL not configured' } });
        continue;
      }
      // on-chain processing would go here
    }
  } finally { _busy = false; }
}
