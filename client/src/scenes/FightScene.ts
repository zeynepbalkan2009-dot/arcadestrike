import Phaser from 'phaser';
import { sendInput, sendReady, getState, on, off, latency } from '../network/NetworkManager';
import type { PlayerInputPayload } from '../../../shared/src/types';

const TICK_MS_V  = 50;   // 20 ticks/sec
const GROUND_Y_V = 380;
const MAX_HP_V   = 100;

let _seq = 0, _tick = 0;

export class FightScene extends Phaser.Scene {
  private fighters = new Map<string, Phaser.GameObjects.Rectangle>();
  private hpBars   = new Map<string, Phaser.GameObjects.Rectangle>();
  private names    = new Map<string, Phaser.GameObjects.Text>();
  private timerTxt!: Phaser.GameObjects.Text;
  private roundTxt!: Phaser.GameObjects.Text;
  private pingTxt!:  Phaser.GameObjects.Text;
  private cursors!:  Phaser.Types.Input.Keyboard.CursorKeys;
  private zKey!:     Phaser.Input.Keyboard.Key;
  private xKey!:     Phaser.Input.Keyboard.Key;
  private inputTimer = 0;

  constructor() { super({ key: 'Fight' }); }

  create(data: { countdown?: number }) {
    _seq = 0; _tick = 0;
    const { width } = this.scale;

    // Stage
    this.add.rectangle(width/2, GROUND_Y_V+35, 800, 70, 0x16213e);
    this.add.rectangle(width/2, GROUND_Y_V, 800, 6, 0xe94560);

    // HUD
    this.timerTxt = this.add.text(width/2, 20, '99', { fontSize:'36px', color:'#fff', fontStyle:'bold' }).setOrigin(0.5,0).setDepth(10);
    this.roundTxt = this.add.text(width/2, 58, 'ROUND 1', { fontSize:'14px', color:'#aaa' }).setOrigin(0.5,0).setDepth(10);
    this.pingTxt  = this.add.text(8, 8, 'ping: --', { fontSize:'11px', color:'#555' }).setDepth(10);
    this.add.text(width/2, 415, 'Arrow Keys: Move/Jump   Z: Attack   X: Block', { fontSize:'11px', color:'#444' }).setOrigin(0.5).setDepth(10);

    // Input keys
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.zKey    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.xKey    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // Countdown overlay
    if (data.countdown) {
      const ov = this.add.text(width/2, 200, String(data.countdown), {
        fontSize:'100px', color:'#e94560', fontStyle:'bold',
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: ov, alpha: 0, duration: 900, onComplete: () => ov.destroy() });
    }

    // Network events
    const onRoundStart  = (d: any) => this.roundTxt.setText('ROUND ' + d.round);
    const onRoundEnd    = (d: any) => this.flashMsg(d.winnerId ? 'ROUND WIN!' : 'DRAW!');
    const onMatchEnd    = (d: any) => { this.cleanup(); this.scene.start('Result', d); };
    const onPlayerHit   = (d: any) => {
      this.hitEffect(d.defenderId);
      if (d.type === 'critical') this.cameras.main.shake(120, 0.006);
    };
    const onDisconnect  = () => { this.cleanup(); this.scene.start('Lobby'); };

    on('roundStart',   onRoundStart);
    on('roundEnd',     onRoundEnd);
    on('matchEnd',     onMatchEnd);
    on('playerHit',    onPlayerHit);
    on('disconnected', onDisconnect);

    this.events.once('shutdown', () => {
      off('roundStart',   onRoundStart);
      off('roundEnd',     onRoundEnd);
      off('matchEnd',     onMatchEnd);
      off('playerHit',    onPlayerHit);
      off('disconnected', onDisconnect);
    });

    // Sync spawned players from server state
    const state = getState();
    if (state?.players) {
      state.players.onAdd((p: any, sid: string) => this.spawnFighter(sid, p));
    }

    sendReady();
  }

  update(_t: number, dt: number) {
    // Mirror server state to sprites
    const state = getState();
    if (state?.players) {
      state.players.forEach((p: any, sid: string) => {
        const body = this.fighters.get(sid);
        if (body) body.setPosition(p.x, p.y - 25);

        const bar = this.hpBars.get(sid);
        if (bar) {
          const pct = Math.max(0, p.hp / MAX_HP_V);
          bar.setScale(pct, 1);
          bar.setFillStyle(pct > .5 ? 0x44ff44 : pct > .25 ? 0xffaa00 : 0xff3333);
        }

        const nm = this.names.get(sid);
        if (nm) nm.setPosition(p.x, p.y - 65);
      });
      if (state.roundTimer !== undefined) {
        this.timerTxt.setText(String(Math.ceil(state.roundTimer)));
      }
    }

    this.pingTxt.setText('ping: ' + latency + 'ms');

    // Send input at tick rate
    this.inputTimer += dt;
    if (this.inputTimer >= TICK_MS_V) {
      this.inputTimer -= TICK_MS_V;
      const inp: PlayerInputPayload = {
        seq:    _seq++,
        tick:   _tick++,
        left:   this.cursors.left?.isDown  ?? false,
        right:  this.cursors.right?.isDown ?? false,
        jump:   this.cursors.up?.isDown    ?? false,
        attack: Phaser.Input.Keyboard.JustDown(this.zKey),
        block:  this.xKey.isDown,
      };
      sendInput(inp);
    }
  }

  private spawnFighter(sid: string, p: any) {
    const isLeft = this.fighters.size === 0;
    const color  = isLeft ? 0x4488ff : 0xff4444;

    const body = this.add.rectangle(p.x, p.y - 25, 44, 50, color).setDepth(5);
    this.fighters.set(sid, body);

    // HP bar background + fill
    this.add.rectangle(p.x - 30, p.y - 70, 60, 8, 0x222222).setOrigin(0, 0.5).setDepth(6);
    const bar = this.add.rectangle(p.x - 30, p.y - 70, 60, 8, 0x44ff44).setOrigin(0, 0.5).setDepth(7);
    this.hpBars.set(sid, bar);

    const nm = this.add.text(p.x, p.y - 82, p.displayName ?? 'Player', {
      fontSize: '11px', color: '#fff',
    }).setOrigin(0.5).setDepth(8);
    this.names.set(sid, nm);

    // Side label
    const label = isLeft ? 'P1' : 'P2';
    const lx    = isLeft ? 60 : (this.scale.width - 60);
    this.add.text(lx, 90, label, { fontSize:'24px', color: isLeft ? '#4488ff' : '#ff4444', fontStyle:'bold' }).setOrigin(0.5).setDepth(10);
  }

  private hitEffect(sessionId: string) {
    const b = this.fighters.get(sessionId);
    if (!b) return;
    this.tweens.add({ targets: b, alpha: 0.15, duration: 70, yoyo: true, repeat: 2 });
  }

  private flashMsg(msg: string) {
    const { width } = this.scale;
    const t = this.add.text(width/2, 180, msg, {
      fontSize: '42px', color: '#e94560', fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, alpha: 0, y: 130, duration: 1800, onComplete: () => t.destroy() });
  }

  private cleanup() { this.events.emit('shutdown'); }
}
