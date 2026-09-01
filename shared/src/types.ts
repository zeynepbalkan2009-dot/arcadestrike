export type PlayerId = string;
export type MatchId  = string;

// Message constants
export const MSG_INPUT       = 'input';
export const MSG_READY       = 'ready';
export const MSG_PING        = 'ping';
export const MSG_PONG        = 'pong';
export const MSG_COUNTDOWN   = 'countdown';
export const MSG_ROUND_START = 'round_start';
export const MSG_ROUND_END   = 'round_end';
export const MSG_MATCH_END   = 'match_end';
export const MSG_PLAYER_HIT  = 'player_hit';
export const MSG_GAME_ERROR  = 'game_error';

export interface PlayerInputPayload {
  seq:    number;
  tick:   number;
  left:   boolean;
  right:  boolean;
  jump:   boolean;
  attack: boolean;
  block:  boolean;
}

export interface HitResult {
  attackerId: PlayerId;
  defenderId: PlayerId;
  damage:     number;
  tick:       number;
  type:       'normal' | 'critical' | 'blocked';
}

export interface QueueEntry {
  playerId:    PlayerId;
  displayName: string;
  mmr:         number;
  enqueuedAt:  number;
}

export interface MatchResult {
  matchId:  MatchId;
  winnerId: PlayerId;
  loserId:  PlayerId;
  reason:   string;
}
