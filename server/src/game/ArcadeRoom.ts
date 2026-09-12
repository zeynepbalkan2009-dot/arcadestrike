import { Room, Client } from '@colyseus/core';
import { ArcadeRoomState, PlayerState } from './GameState';
import { simulateTick, resetCombatMeta } from './CombatEngine';
import { logger } from '../utils/logger';
import {
  TICK_MS, MAX_HP, ROUNDS_TO_WIN, ROUND_DURATION_S, STAGE_WIDTH, GROUND_Y,
} from './shared/combat';
import {
  MSG_INPUT, MSG_READY, MSG_PING, MSG_PONG,
  MSG_COUNTDOWN, MSG_ROUND_START, MSG_ROUND_END, MSG_MATCH_END,
  MSG_PLAYER_HIT,
} from './shared/types';
import type { PlayerInputPayload } from './shared/types';
import { randomUUID } from 'crypto';

const SPAWN_X = [150, STAGE_WIDTH - 150];
const TICK_RATE = 20;

export class ArcadeRoom extends Room<ArcadeRoomState> {
  maxClients = 2;
  private _tickInterval: ReturnType<typeof setInterval> | null = null;
  private _countdownTimer: ReturnType<typeof setTimeout> | null = null;
  // Keyed by sessionId
  private _inputs = new Map<string, PlayerInputPayload>();
  private _roundStartTick = 0;

  onCreate() {
    this.setState(new ArcadeRoomState());
    this.state.matchId = randomUUID();

    this.onMessage(MSG_INPUT, (client: Client, data: PlayerInputPayload) => {
      if (this.state.phase === 'fighting') {
        this._inputs.set(client.sessionId, data);
      }
    });
    this.onMessage(MSG_READY, () => {});
    this.onMessage(MSG_PING, (client: Client, d: any) => {
      client.send(MSG_PONG, { ts: d?.ts ?? Date.now() });
    });

    // Dispose if second player never joins
    this.clock.setTimeout(() => {
      if (this.clients.length < 2) {
        logger.warn('[Room] timeout waiting for players — disposing');
        this.disconnect();
      }
    }, 30_000);

    logger.info('[Room] created ' + this.roomId);
  }

  onJoin(client: Client, options: Record<string, any>) {
    const idx = this.state.players.size;
    const p   = new PlayerState();
    p.playerId    = String(options.playerId    ?? client.sessionId);
    p.displayName = String(options.displayName ?? 'Player');
    p.x           = SPAWN_X[idx] ?? 400;
    p.y           = GROUND_Y;
    p.hp          = MAX_HP;
    p.connected   = true;
    p.facingRight = idx === 0;

    this.state.players.set(client.sessionId, p);
    logger.info(`[Room] ${p.displayName} joined (${this.state.players.size}/2)`);

    if (this.state.players.size === 2) this._startCountdown();
  }

  onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (p) p.connected = false;

    if (this.state.phase === 'fighting' || this.state.phase === 'countdown') {
      const alive = [...this.state.players.values()].find(pl => pl.connected);
      if (alive) this._endMatch(alive.playerId, 'disconnect');
    }
    logger.info(`[Room] player left (consented=${consented})`);
  }

  onDispose() {
    this._clearTimers();
    resetCombatMeta([...this.state.players.keys()]);
    logger.info('[Room] disposed ' + this.roomId);
  }

  private _startCountdown() {
    this.state.phase = 'countdown';
    this.state.countdown = 3;
    this.broadcast(MSG_COUNTDOWN, { seconds: 3 });

    let n = 3;
    const tick = () => {
      n--;
      this.state.countdown = n;
      this.broadcast(MSG_COUNTDOWN, { seconds: n });
      if (n > 0) {
        this._countdownTimer = setTimeout(tick, 1000);
      } else {
        this._startRound();
      }
    };
    this._countdownTimer = setTimeout(tick, 1000);
  }

  private _startRound() {
    let idx = 0;
    for (const p of this.state.players.values()) {
      p.x = SPAWN_X[idx] ?? 400; p.y = GROUND_Y;
      p.hp = MAX_HP; p.velX = 0; p.velY = 0;
      p.grounded = true; p.attacking = false; p.blocking = false;
      p.facingRight = idx === 0;
      idx++;
    }
    this.state.phase      = 'fighting';
    this.state.roundTimer = ROUND_DURATION_S;
    this._roundStartTick  = this.state.tick;
    this._inputs.clear();

    this.broadcast(MSG_ROUND_START, { round: this.state.currentRound, duration: ROUND_DURATION_S });
    logger.info(`[Room] round ${this.state.currentRound} started`);

    this._tickInterval = setInterval(() => this._gameTick(), TICK_MS);
  }

  private _gameTick() {
    if (this.state.phase !== 'fighting') return;
    this.state.tick++;

    // Build player map for simulation (keyed by sessionId for input lookup)
    const pm = new Map<string, PlayerState>();
    for (const [sid, p] of this.state.players) {
      if (p.connected) pm.set(sid, p);
    }

    const hits = simulateTick(pm, this._inputs, Date.now());
    this._inputs.clear();

    for (const hit of hits) {
      this.broadcast(MSG_PLAYER_HIT, { ...hit, tick: this.state.tick });
    }

    // Update round timer
    const elapsed = this.state.tick - this._roundStartTick;
    this.state.roundTimer = Math.max(0, ROUND_DURATION_S - Math.floor(elapsed / TICK_RATE));

    // Win condition check
    const players = [...this.state.players.values()].filter(p => p.connected);
    const dead = players.find(p => p.hp <= 0);
    if (dead) {
      const winner = players.find(p => p.playerId !== dead.playerId);
      this._endRound(winner?.playerId ?? null, 'hp');
      return;
    }
    if (this.state.roundTimer <= 0) {
      const sorted = [...players].sort((a, b) => b.hp - a.hp);
      const winner = sorted[0]?.hp !== sorted[1]?.hp ? sorted[0] : null;
      this._endRound(winner?.playerId ?? null, 'timeout');
    }
  }

  private _endRound(winnerId: string | null, reason: string) {
    if (this.state.phase !== 'fighting') return;
    this._clearTimers();
    this.state.phase = 'round_end';

    if (winnerId) {
      const wp = [...this.state.players.values()].find(p => p.playerId === winnerId);
      if (wp) wp.roundsWon++;
    }

    this.broadcast(MSG_ROUND_END, { round: this.state.currentRound, winnerId, reason });
    logger.info(`[Room] round ${this.state.currentRound} ended — winner: ${winnerId ?? 'draw'}`);

    const matchWinner = [...this.state.players.values()].find(p => p.roundsWon >= ROUNDS_TO_WIN);
    if (matchWinner) {
      this.clock.setTimeout(() => this._endMatch(matchWinner.playerId, 'rounds'), 2000);
      return;
    }

    this.state.currentRound++;
    this.clock.setTimeout(() => this._startCountdown(), 3000);
  }

  private _endMatch(winnerId: string, reason: string) {
    if (this.state.phase === 'match_end') return;
    this._clearTimers();
    this.state.phase    = 'match_end';
    this.state.winnerId = winnerId;

    const loser = [...this.state.players.values()].find(p => p.playerId !== winnerId);
    this.broadcast(MSG_MATCH_END, {
      matchId:  this.state.matchId,
      winnerId,
      loserId:  loser?.playerId ?? '',
      reason,
    });

    logger.info(`[Room] match ended — winner: ${winnerId}, reason: ${reason}`);
    this.clock.setTimeout(() => this.disconnect(), 5000);
  }

  private _clearTimers() {
    if (this._tickInterval)    { clearInterval(this._tickInterval);   this._tickInterval = null; }
    if (this._countdownTimer)  { clearTimeout(this._countdownTimer);  this._countdownTimer = null; }
  }
}
