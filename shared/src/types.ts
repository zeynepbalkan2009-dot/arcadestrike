export type PlayerId = string;
export const MSG_INPUT='input', MSG_READY='ready', MSG_PING='ping', MSG_PONG='pong';
export const MSG_COUNTDOWN='countdown', MSG_ROUND_START='round_start', MSG_ROUND_END='round_end';
export const MSG_MATCH_END='match_end', MSG_PLAYER_HIT='player_hit', MSG_GAME_ERROR='game_error';
export interface PlayerInputPayload { seq:number; tick:number; left:boolean; right:boolean; jump:boolean; attack:boolean; block:boolean; }
export interface HitResult { attackerId:string; defenderId:string; damage:number; tick:number; type:'normal'|'critical'|'blocked'; }
export interface QueueEntry { playerId:string; displayName:string; mmr:number; enqueuedAt:number; }
