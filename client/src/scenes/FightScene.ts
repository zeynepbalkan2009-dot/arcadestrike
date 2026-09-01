import Phaser from 'phaser';
import { sendInput, sendReady, getState, on, off, latency } from '../network/NetworkManager';
import type { PlayerInputPayload } from '../../../shared/src/types';

const TICK_MS  = 50;   // 20 ticks/s
const MAX_HP   = 100;
const GROUND_Y = 380;
const STAGE_W  = 800;

let _seq = 0, _tick = 0;

interface FighterGfx {
  body:   Phaser.GameObjects.Rectangle;
  hpBg:   Phaser.GameObjects.Rectangle;
  hpBar:  Phaser.GameObjects.Rectangle;
  name:   Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
}

export class FightScene extends Phaser.Scene {
  private fighters  = new Map<string, FighterGfx>();
  private timerTxt!: Phaser.GameObjects.Text;
  private roundTxt!: Phaser.GameObjects.Text;
  private pingTxt!:  Phaser.GameObjects.Text;
  private p1HpTxt!:  Phaser.GameObjects.Text;
  private p2HpTxt!:  Phaser.GameObjects.Text;
  private cursors!:  Phaser.Types.Input.Keyboard.CursorKeys;
  private zKey!:     Phaser.Input.Keyboard.Key;
  private xKey!:     Phaser.Input.Keyboard.Key;
  private inputTimer = 0;
  private playerOrder: string[] = [];

  constructor() { super({ key: 'Fight' }); }

  create(data: { countdown?: number }) {
    _seq = 0; _tick = 0;
    const W = this.scale.width;

    // ── Background ──────────────────────────────────────────────
    this.add.rectangle(W/2, 225, 800, 450, 0x0f0f1a);
    for (let i = 0; i < 40; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, 300),
        Phaser.Math.FloatBetween(0.5,2), 0xffffff, Phaser.Math.FloatBetween(0.05,0.3)
      );
    }
    // Floor
    this.add.rectangle(W/2, GROUND_Y+1, STAGE_W, 2, 0xe94560, 0.8);
    this.add.rectangle(W/2, GROUND_Y+35, STAGE_W, 70, 0x12121e);
    // Floor glow
    const glow = this.add.rectangle(W/2, GROUND_Y+2, STAGE_W, 4, 0xe94560, 0.15);
    this.tweens.add({ targets: glow, alpha: 0.05, duration: 1500, yoyo: true, repeat: -1 });

    // ── HUD ─────────────────────────────────────────────────────
    // Timer box
    this.add.rectangle(W/2, 30, 80, 44, 0x1a1a2e).setDepth(10);
    this.add.rectangle(W/2, 30, 80, 44, 0).setStrokeStyle(2, 0xe94560, 0.6).setDepth(10);
    this.timerTxt = this.add.text(W/2, 30, '99', {
      fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    this.roundTxt = this.add.text(W/2, 58, 'ROUND 1', {
      fontSize: '12px', color: '#e94560', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(10);

    // P1 HP bar (left)
    this.add.rectangle(200, 22, 240, 18, 0x1a1a2e).setDepth(10);
    this.p1HpTxt = this.add.text(90, 22, 'P1', { fontSize:'11px', color:'#4488ff' }).setOrigin(0,0.5).setDepth(11);

    // P2 HP bar (right)
    this.add.rectangle(600, 22, 240, 18, 0x1a1a2e).setDepth(10);
    this.p2HpTxt = this.add.text(710, 22, 'P2', { fontSize:'11px', color:'#ff4444' }).setOrigin(1,0.5).setDepth(11);

    this.pingTxt = this.add.text(4, 4, '', { fontSize:'10px', color:'#333' }).setDepth(10);

    // Controls hint
    this.add.text(W/2, 432, '← → Move   ↑ Jump   Z Attack   X Block', {
      fontSize: '10px', color: '#2a2a3a',
    }).setOrigin(0.5).setDepth(10);

    // ── Input ───────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.zKey    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.xKey    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // ── Countdown overlay ────────────────────────────────────────
    if (data?.countdown && data.countdown > 0) {
      this._showCountdown(data.countdown);
    }

    // ── Network events ───────────────────────────────────────────
    const onRoundStart  = (d: any) => { this.roundTxt.setText('ROUND ' + d.round); this._showFlash('FIGHT!', '#e94560'); };
    const onRoundEnd    = (d: any) => this._showFlash(d.winnerId ? 'KO!' : 'DRAW!', '#ffff00');
    const onMatchEnd    = (d: any) => { this.cleanup(); this.time.delayedCall(1500, () => this.scene.start('Result', d)); };
    const onPlayerHit   = (d: any) => { this._onHit(d); };
    const onDisconnect  = ()       => { this.cleanup(); this.scene.start('Lobby'); };

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

    // ── State sync ───────────────────────────────────────────────
    const state = getState();
    if (state?.players) {
      state.players.onAdd((p: any, sid: string) => {
        this.playerOrder.push(sid);
        this._spawnFighter(sid, p, this.playerOrder.length - 1);
      });
    }

    sendReady();
  }

  update(_t: number, dt: number) {
    const state = getState();
    if (state?.players) {
      let idx = 0;
      state.players.forEach((p: any, sid: string) => {
        const gfx = this.fighters.get(sid);
        if (gfx) {
          gfx.body.setPosition(p.x, p.y - 25);
          gfx.shadow.setPosition(p.x, GROUND_Y + 6);
          gfx.name.setPosition(p.x, p.y - 82);

          const pct = Math.max(0, p.hp / MAX_HP);
          gfx.hpBar.setScale(pct, 1);
          gfx.hpBar.setFillStyle(pct > .5 ? 0x44ff44 : pct > .25 ? 0xffaa00 : 0xff3333);

          // Update HUD HP labels
          if (idx === 0) this.p1HpTxt.setText(`P1  ${p.hp}HP`);
          else           this.p2HpTxt.setText(`${p.hp}HP  P2`);
        }
        idx++;
      });

      if (state.roundTimer !== undefined) {
        this.timerTxt.setText(String(Math.ceil(Math.max(0, state.roundTimer))));
      }
    }

    this.pingTxt.setText(latency + 'ms');

    this.inputTimer += dt;
    if (this.inputTimer >= TICK_MS) {
      this.inputTimer -= TICK_MS;
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

  private _spawnFighter(sid: string, p: any, idx: number) {
    const isLeft = idx === 0;
    const color  = isLeft ? 0x4488ff : 0xff4444;
    const hpX    = isLeft ? 90 : 630;

    const shadow = this.add.ellipse(p.x, GROUND_Y+6, 50, 14, 0x000000, 0.3).setDepth(3);
    const body   = this.add.rectangle(p.x, p.y-25, 44, 50, color).setDepth(5);

    // HP bar on HUD
    const hpBg  = this.add.rectangle(hpX, 22, 200, 10, 0x222222).setOrigin(isLeft ? 0 : 1, 0.5).setDepth(10);
    const hpBar = this.add.rectangle(hpX, 22, 200, 10, 0x44ff44).setOrigin(isLeft ? 0 : 1, 0.5).setDepth(11);

    const name  = this.add.text(p.x, p.y-82, p.displayName ?? 'Player', {
      fontSize: '11px', color: isLeft ? '#4488ff' : '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(8);

    this.fighters.set(sid, { body, hpBg, hpBar, name, shadow });

    // Spawn flash
    this.tweens.add({ targets: body, alpha: 0, duration: 100, yoyo: true, repeat: 3 });
  }

  private _onHit(d: any) {
    // Flash the hit fighter
    const gfx = [...this.fighters.entries()].find(([, g]) => {
      // Find by matching player state
      const state = getState();
      if (!state?.players) return false;
      let found = false;
      state.players.forEach((p: any, sid: string) => { if (p.playerId === d.defenderId && this.fighters.has(sid)) found = sid === [...this.fighters.keys()].find(k => this.fighters.get(k) === g); });
      return found;
    })?.[1];

    if (gfx) {
      this.tweens.add({ targets: gfx.body, alpha: 0.1, duration: 60, yoyo: true, repeat: 2 });
    }

    if (d.type === 'critical') {
      this.cameras.main.shake(150, 0.007);
      this._showFlash('CRITICAL!', '#ffff00');
    } else if (d.type === 'blocked') {
      this._showFlash('BLOCKED', '#aaaaff');
    }
  }

  private _showCountdown(seconds: number) {
    const W = this.scale.width;
    let n = seconds;
    const show = (num: number) => {
      const t = this.add.text(W/2, 200, num > 0 ? String(num) : 'FIGHT!', {
        fontSize: '96px', color: num > 0 ? '#ffffff' : '#e94560',
        fontStyle: 'bold', stroke: '#000', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(20).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 200, yoyo: true, hold: 600,
        onComplete: () => { t.destroy(); if (n > 1) { n--; this.time.delayedCall(100, () => show(n)); } else { this.time.delayedCall(100, () => show(0)); } }
      });
    };
    show(n);
  }

  private _showFlash(msg: string, color: string) {
    const W = this.scale.width;
    const t = this.add.text(W/2, 170, msg, {
      fontSize: '44px', color, fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, alpha: 0, y: 130, duration: 1200, ease: 'Power2', onComplete: () => t.destroy() });
  }

  private cleanup() { this.events.emit('shutdown'); }
}
