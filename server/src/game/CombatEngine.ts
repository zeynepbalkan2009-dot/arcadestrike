import { PlayerState } from './GameState';
import {
  GRAVITY, JUMP_VELOCITY, MOVE_SPEED, TICK_MS,
  STAGE_WIDTH, GROUND_Y, ATTACK_RANGE, ATTACK_DAMAGE,
  CRIT_MULTIPLIER, BLOCK_REDUCTION, ATTACK_COOLDOWN_MS,
} from '../shared/combat';
import type { PlayerInputPayload, HitResult } from '../shared/types';

const FIGHTER_WIDTH = 44;
const MIN_DIST      = FIGHTER_WIDTH + 2;

const _meta = new Map<string, { lastAttackMs: number }>();
function getMeta(id: string) {
  if (!_meta.has(id)) _meta.set(id, { lastAttackMs: 0 });
  return _meta.get(id)!;
}
export function resetCombatMeta(ids: string[]) { ids.forEach(id => _meta.delete(id)); }

export function simulateTick(
  players: Map<string, PlayerState>,
  inputs:  Map<string, PlayerInputPayload>,
  nowMs:   number,
): HitResult[] {
  const hits: HitResult[] = [];
  const dt = TICK_MS / 1000;

  // ── 1. Physics ─────────────────────────────────────────────────
  for (const [sid, p] of players) {
    if (!p.connected) continue;
    const inp = inputs.get(sid);
    if (!inp) {
      if (!p.grounded) { p.velY += GRAVITY * dt; p.y += p.velY * dt; }
      if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.velY = 0; p.grounded = true; }
      continue;
    }
    const meta = getMeta(p.playerId);

    if (inp.left)       { p.velX = -MOVE_SPEED; p.facingRight = false; }
    else if (inp.right) { p.velX =  MOVE_SPEED; p.facingRight = true;  }
    else                  p.velX = 0;

    if (inp.jump && p.grounded) { p.velY = JUMP_VELOCITY; p.grounded = false; }
    if (!p.grounded) p.velY += GRAVITY * dt;

    p.x += p.velX * dt;
    p.y += p.velY * dt;

    if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.velY = 0; p.grounded = true; }
    p.x = Math.max(FIGHTER_WIDTH / 2, Math.min(STAGE_WIDTH - FIGHTER_WIDTH / 2, p.x));

    p.attacking = inp.attack && (nowMs - meta.lastAttackMs) >= ATTACK_COOLDOWN_MS;
    p.blocking  = inp.block && !inp.attack;
    if (p.attacking) meta.lastAttackMs = nowMs;
  }

  // ── 2. Collision — push fighters apart (NO GHOST WALKING) ─────
  const pArr = [...players.values()].filter(p => p.connected);
  if (pArr.length === 2) {
    const [a, b] = pArr;
    const dx      = b.x - a.x;
    const absDx   = Math.abs(dx);
    const overlap = MIN_DIST - absDx;

    if (overlap > 0) {
      const half = overlap / 2 + 0.5;
      if (dx >= 0) { a.x -= half; b.x += half; }
      else         { a.x += half; b.x -= half; }
      // Kill velocity toward each other
      if (dx >= 0) { if (a.velX > 0) a.velX = 0; if (b.velX < 0) b.velX = 0; }
      else         { if (a.velX < 0) a.velX = 0; if (b.velX > 0) b.velX = 0; }
      // Clamp
      a.x = Math.max(FIGHTER_WIDTH / 2, Math.min(STAGE_WIDTH - FIGHTER_WIDTH / 2, a.x));
      b.x = Math.max(FIGHTER_WIDTH / 2, Math.min(STAGE_WIDTH - FIGHTER_WIDTH / 2, b.x));
    }

    // Auto-face opponent
    a.facingRight = b.x >= a.x;
    b.facingRight = a.x >  b.x;
  }

  // ── 3. Attack resolution ───────────────────────────────────────
  const alive = [...players.values()].filter(p => p.connected && p.hp > 0);
  for (let i = 0; i < alive.length; i++) {
    const atk = alive[i];
    if (!atk.attacking) continue;
    for (let j = 0; j < alive.length; j++) {
      if (i === j) continue;
      const def  = alive[j];
      const dist = Math.abs(atk.x - def.x);
      if (dist > ATTACK_RANGE) continue;
      const facingDef = atk.facingRight ? def.x > atk.x : def.x < atk.x;
      if (!facingDef) continue;

      const isCrit = Math.random() < 0.1;
      let dmg = ATTACK_DAMAGE * (isCrit ? CRIT_MULTIPLIER : 1);
      if (def.blocking) dmg *= BLOCK_REDUCTION;
      dmg = Math.round(dmg);

      def.hp = Math.max(0, def.hp - dmg);

      // Knockback
      const kbDir = def.x > atk.x ? 1 : -1;
      def.x += kbDir * 22;
      def.x  = Math.max(FIGHTER_WIDTH / 2, Math.min(STAGE_WIDTH - FIGHTER_WIDTH / 2, def.x));
      if (def.grounded && !def.blocking) { def.velY = -180; def.grounded = false; }

      hits.push({
        attackerId: atk.playerId,
        defenderId: def.playerId,
        damage:     dmg,
        tick:       0,
        type:       isCrit ? 'critical' : def.blocking ? 'blocked' : 'normal',
      });
    }
  }
  return hits;
}
