import { Schema, MapSchema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string')  playerId    = '';
  @type('string')  displayName = '';
  @type('number')  x           = 100;
  @type('number')  y           = 380;
  @type('number')  velX        = 0;
  @type('number')  velY        = 0;
  @type('number')  hp          = 100;
  @type('boolean') grounded    = true;
  @type('boolean') attacking   = false;
  @type('boolean') blocking    = false;
  @type('boolean') facingRight = true;
  @type('boolean') connected   = true;
  @type('number')  roundsWon   = 0;
  @type('number')  lastSeq     = 0;
}

export class ArcadeRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type('string') phase        = 'waiting';
  @type('number') countdown    = 0;
  @type('number') tick         = 0;
  @type('number') roundTimer   = 99;
  @type('number') currentRound = 1;
  @type('string') winnerId     = '';
  @type('string') matchId      = '';
}
