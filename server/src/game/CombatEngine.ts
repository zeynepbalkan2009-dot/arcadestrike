import { PlayerState } from './GameState';
import {
  GRAVITY, JUMP_VELOCITY, MOVE_SPEED, TICK_MS,
  STAGE_WIDTH, GROUND_Y, ATTACK_RANGE, ATTACK_DAMAGE,
  CRIT_MULTIPLIER, BLOCK_REDUCTION, ATTACK_COOLDOWN_MS,
} from './shared/combat';
import type { PlayerInputPayload, HitResult } from './shared/types';

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

  for (const [, p] of players) {
    if (!p.connected) continue;
    const inp = inputs.get(p.playerId) ?? inputs.get([...players.entries()].find(([,v]) => v === p)?.[0] ?? '');
    if (!inp) {
      // No input this tick — apply physics only
      if (!p.grounded) { p.velY += GRAVITY * dt; p.y += p.velY * dt; }
      if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.velY = 0; p.grounded = true; }
      p.velX = 0;
      continue;
    }
    const meta = getMeta(p.playerId);

    // Horizontal movement
    if (inp.left)       { p.velX = -MOVE_SPEED; p.facingRight = false; }
    else if (inp.right) { p.velX = MOVE_SPEED;  p.facingRight = true;  }
    else                  p.velX = 0;

    // Jump
    if (inp.jump && p.grounded) { p.velY = JUMP_VELOCITY; p.grounded = false; }

    // Gravity
    if (!p.grounded) p.velY += GRAVITY * dt;

    // Integrate
    p.x += p.velX * dt;
    p.y += p.velY * dt;

    // Ground clamp
    if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.velY = 0; p.grounded = true; }

    // Stage bounds
    p.x = Math.max(0, Math.min(STAGE_WIDTH, p.x));

    // Combat state
    p.attacking = inp.attack && (nowMs - meta.lastAttackMs) >= ATTACK_COOLDOWN_MS;
    p.blocking  = inp.block && !inp.attack;
    if (p.attacking) meta.lastAttackMs = nowMs;
  }

  // Resolve attacks between players
  const arr = [...players.values()].filter(p => p.connected && p.hp > 0);
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (!a.attacking) continue;
    for (let j = 0; j < arr.length; j++) {
      if (i === j) continue;
      const d = arr[j];
      if (Math.abs(a.x - d.x) > ATTACK_RANGE) continue;
      const facingDef = a.facingRight ? d.x > a.x : d.x < a.x;
      if (!facingDef) continue;
      const isCrit = Math.random() < 0.1;
      let dmg = ATTACK_DAMAGE * (isCrit ? CRIT_MULTIPLIER : 1);
      if (d.blocking) dmg *= BLOCK_REDUCTION;
      dmg = Math.round(dmg);
      d.hp = Math.max(0, d.hp - dmg);
      hits.push({
        attackerId: a.playerId,
        defenderId: d.playerId,
        damage:     dmg,
        tick:       0,
        type:       isCrit ? 'critical' : d.blocking ? 'blocked' : 'normal',
      });
    }
  }
  return hits;
}
