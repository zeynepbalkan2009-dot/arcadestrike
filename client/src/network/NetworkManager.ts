import { Client, Room } from 'colyseus.js';
import {
  MSG_INPUT, MSG_READY, MSG_PING, MSG_PONG,
  MSG_COUNTDOWN, MSG_ROUND_START, MSG_ROUND_END, MSG_MATCH_END,
  MSG_PLAYER_HIT, MSG_GAME_ERROR,
} from '../../../shared/src/types';
import type { PlayerInputPayload } from '../../../shared/src/types';

declare const __SERVER_URL__: string;

type CB = (data?: any) => void;
const _handlers = new Map<string, CB[]>();
let _client: Client | null = null;
let _room:   Room   | null = null;
let _pingInterval: ReturnType<typeof setInterval> | null = null;
export let latency = 0;

export function initNetwork(url?: string) {
  _client = new Client(url ?? __SERVER_URL__);
}

export async function joinMatchmaking(playerId: string, displayName: string, mmr = 1000) {
  if (!_client) throw new Error('Network not initialized');

  _room = await _client.joinOrCreate<any>('arcade', { playerId, displayName, mmr });

  _room.onMessage(MSG_COUNTDOWN,   d => emit('countdown',   d));
  _room.onMessage(MSG_ROUND_START, d => emit('roundStart',  d));
  _room.onMessage(MSG_ROUND_END,   d => emit('roundEnd',    d));
  _room.onMessage(MSG_MATCH_END,   d => emit('matchEnd',    d));
  _room.onMessage(MSG_PLAYER_HIT,  d => emit('playerHit',   d));
  _room.onMessage(MSG_GAME_ERROR,  d => emit('error',       d));
  _room.onMessage(MSG_PONG,        d => { latency = Date.now() - (d?.ts ?? Date.now()); });
  _room.onLeave(() => { _clearPing(); emit('disconnected'); });

  _pingInterval = setInterval(() => _room?.send(MSG_PING, { ts: Date.now() }), 2000);
  emit('connected');
}

export function sendInput(inp: PlayerInputPayload) { _room?.send(MSG_INPUT, inp); }
export function sendReady()                        { _room?.send(MSG_READY); }
export function getState()                         { return _room?.state; }
export function getRoomId()                        { return _room?.id ?? null; }

export async function leaveRoom() {
  _clearPing();
  await _room?.leave();
  _room = null;
}

export function on(event: string, cb: CB) {
  if (!_handlers.has(event)) _handlers.set(event, []);
  _handlers.get(event)!.push(cb);
}
export function off(event: string, cb: CB) {
  _handlers.set(event, (_handlers.get(event) ?? []).filter(fn => fn !== cb));
}
function emit(event: string, data?: any) {
  (_handlers.get(event) ?? []).forEach(fn => fn(data));
}
function _clearPing() {
  if (_pingInterval) { clearInterval(_pingInterval); _pingInterval = null; }
}
