import Phaser from 'phaser';
import { sendInput, sendReady, getState, on, off, latency } from '../network/NetworkManager.js';

const TICK = 50, GY = 380, MHP = 100, SW = 800;
let seq = 0, tick = 0;

export class FightScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Fight' });
    this.fighters = new Map();
    this.it = 0;
    this.order = [];
  }

  create(data) {
    seq = 0; tick = 0;
    const W = this.scale.width, H = this.scale.height;

    // Background
    this.add.rectangle(W/2, H/2, W, H, 0x0a0a12);
    for (let i = 0; i < 60; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.85),
        Phaser.Math.FloatBetween(0.5, 2), 0xffffff, Phaser.Math.FloatBetween(0.15, 0.7)
      );
      this.tweens.add({ targets: star, alpha: 0.05, duration: Phaser.Math.Between(800,3000), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0,2000) });
    }

    // Floor
    this.add.rectangle(W/2, GY+38, SW, 76, 0x0d0d1a);
    this.add.rectangle(W/2, GY+3, SW, 6, 0xe94560, 0.3);
    this.add.rectangle(W/2, GY, SW, 3, 0xe94560);
    const floorGlow = this.add.rectangle(W/2, GY, SW, 12, 0xe94560, 0.08);
    this.tweens.add({ targets: floorGlow, alpha: 0.03, duration: 1200, yoyo: true, repeat: -1 });

    // Stage edge danger lines
    this.add.rectangle(24, GY-28, 3, 56, 0xe94560, 0.4);
    this.add.rectangle(W-24, GY-28, 3, 56, 0xe94560, 0.4);

    // HUD — Timer
    this.add.rectangle(W/2, 32, 90, 52, 0x0d0d1a).setDepth(10);
    this.add.rectangle(W/2, 32, 90, 52, 0x0d0d1a, 0).setStrokeStyle(2, 0xe94560, 0.9).setDepth(10);
    this.timerT = this.add.text(W/2, 32, '99', { fontSize:'32px', color:'#ffffff', fontStyle:'bold', fontFamily:'monospace' }).setOrigin(0.5).setDepth(11);
    this.roundT = this.add.text(W/2, 62, 'ROUND 1', { fontSize:'10px', color:'#e94560', letterSpacing:3 }).setOrigin(0.5).setDepth(10);

    // P1 HP bar
    this.add.text(18, 14, 'P1', { fontSize:'13px', color:'#4488ff', fontStyle:'bold' }).setDepth(10);
    this.add.rectangle(162, 22, 202, 16, 0x0d0d1a).setDepth(10);
    this.p1HpFill = this.add.rectangle(62, 22, 200, 12, 0x44ff88).setOrigin(0, 0.5).setDepth(11);
    this.p1HpText = this.add.text(270, 22, '100', { fontSize:'11px', color:'#88ffaa', fontFamily:'monospace' }).setOrigin(1, 0.5).setDepth(12);

    // P2 HP bar
    this.add.text(W-18, 14, 'P2', { fontSize:'13px', color:'#ff4444', fontStyle:'bold' }).setOrigin(1,0).setDepth(10);
    this.add.rectangle(W-162, 22, 202, 16, 0x0d0d1a).setDepth(10);
    this.p2HpFill = this.add.rectangle(W-62, 22, 200, 12, 0xff4444).setOrigin(1, 0.5).setDepth(11);
    this.p2HpText = this.add.text(W-270, 22, '100', { fontSize:'11px', color:'#ff8888', fontFamily:'monospace' }).setOrigin(0, 0.5).setDepth(12);

    this.pingT = this.add.text(4, 4, '', { fontSize:'10px', color:'#222233' }).setDepth(10);
    this.add.text(W/2, 435, '\u2190 \u2192 Move   \u2191 Jump   Z Attack   X Block', { fontSize:'10px', color:'#1a1a2e' }).setOrigin(0.5).setDepth(10);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    if (data?.countdown && data.countdown > 0) this._countdown(data.countdown);

    // Network events
    const onRS = (d) => { this.roundT.setText('ROUND ' + d.round); this._flash('FIGHT!', '#e94560', 52); };
    const onRE = (d) => this._flash(d.winnerId ? 'KO!' : 'DRAW!', '#ffff00', 60);
    const onME = (d) => { this.cleanup(); this.time.delayedCall(1800, () => this.scene.start('Result', d)); };
    const onH  = (d) => this._onHit(d);
    const onD  = () => { this.cleanup(); this.scene.start('Lobby'); };
    on('roundStart', onRS); on('roundEnd', onRE); on('matchEnd', onME); on('playerHit', onH); on('disconnected', onD);
    this.events.once('shutdown', () => { off('roundStart', onRS); off('roundEnd', onRE); off('matchEnd', onME); off('playerHit', onH); off('disconnected', onD); });

    const state = getState();
    if (state?.players) state.players.onAdd((p, sid) => { this.order.push(sid); this._spawn(sid, p, this.order.length - 1); });
    sendReady();
  }

  update(_t, delta) {
    const state = getState();
    if (state?.players) {
      let i = 0;
      state.players.forEach((p, sid) => {
        const g = this.fighters.get(sid);
        if (!g) { i++; return; }

        // Smooth lerp toward server position
        g.body.x    = Phaser.Math.Linear(g.body.x,    p.x,      0.35);
        g.body.y    = Phaser.Math.Linear(g.body.y,    p.y - 25, 0.35);
        g.head.x    = Phaser.Math.Linear(g.head.x,    p.x,      0.35);
        g.head.y    = Phaser.Math.Linear(g.head.y,    p.y - 58, 0.35);
        g.shadow.x  = Phaser.Math.Linear(g.shadow.x,  p.x,      0.35);
        g.outline.x = Phaser.Math.Linear(g.outline.x, p.x,      0.35);
        g.outline.y = Phaser.Math.Linear(g.outline.y, p.y - 25, 0.35);
        g.name.x    = Phaser.Math.Linear(g.name.x,    p.x,      0.35);
        g.name.y    = Phaser.Math.Linear(g.name.y,    p.y - 90, 0.35);
        g.hpBg.x    = Phaser.Math.Linear(g.hpBg.x,    p.x,      0.35);
        g.hpBg.y    = Phaser.Math.Linear(g.hpBg.y,    p.y - 76, 0.35);
        g.hpBar.x   = Phaser.Math.Linear(g.hpBar.x,   p.x - 24, 0.35);
        g.hpBar.y   = Phaser.Math.Linear(g.hpBar.y,   p.y - 76, 0.35);

        // HP color
        const pct = Math.max(0, p.hp / MHP);
        const hpCol = pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffcc00 : 0xff3333;
        g.hpBar.setScale(pct, 1);
        g.hpBar.setFillStyle(hpCol);

        if (i === 0) {
          this.p1HpFill.setScale(pct, 1); this.p1HpFill.setFillStyle(hpCol);
          this.p1HpText.setText(String(p.hp));
        } else {
          this.p2HpFill.setScale(pct, 1); this.p2HpFill.setFillStyle(hpCol);
          this.p2HpText.setText(String(p.hp));
        }

        // Block tint
        if (p.blocking) { g.body.setFillStyle(0xaaaaff); g.head.setFillStyle(0xaaaaff); }
        else { g.body.setFillStyle(i === 0 ? 0x3377ee : 0xee3333); g.head.setFillStyle(i === 0 ? 0x3377ee : 0xee3333); }

        i++;
      });
      if (state.roundTimer !== undefined) this.timerT.setText(String(Math.ceil(Math.max(0, state.roundTimer))));
    }
    this.pingT.setText(latency + 'ms');
    this.it += delta;
    if (this.it >= TICK) {
      this.it -= TICK;
      sendInput({ seq: seq++, tick: tick++, left: this.cursors.left?.isDown ?? false, right: this.cursors.right?.isDown ?? false, jump: this.cursors.up?.isDown ?? false, attack: Phaser.Input.Keyboard.JustDown(this.zKey), block: this.xKey.isDown });
    }
  }

  _spawn(sid, p, idx) {
    const isLeft = idx === 0;
    const bodyCol = isLeft ? 0x3377ee : 0xee3333;
    const glowCol = isLeft ? 0x4488ff : 0xff4444;
    const hpX = p.x - 24;

    const shadow  = this.add.ellipse(p.x, GY+8, 54, 18, 0x000000, 0.4).setDepth(2);
    const outline = this.add.rectangle(p.x, p.y-25, 48, 54, 0, 0).setStrokeStyle(2, glowCol, 0.7).setDepth(4);
    const body    = this.add.rectangle(p.x, p.y-25, 44, 50, bodyCol).setDepth(5);
    const head    = this.add.circle(p.x, p.y-58, 14, bodyCol).setDepth(5);
    const hpBg    = this.add.rectangle(p.x, p.y-76, 50, 8, 0x111122).setDepth(7);
    const hpBar   = this.add.rectangle(hpX, p.y-76, 48, 5, 0x44ff88).setOrigin(0, 0.5).setDepth(8);
    const name    = this.add.text(p.x, p.y-90, p.displayName ?? 'Player', { fontSize:'11px', color: isLeft ? '#88aaff' : '#ff8888', fontStyle:'bold' }).setOrigin(0.5).setDepth(8);

    this.fighters.set(sid, { body, head, outline, shadow, hpBg, hpBar, name });

    // Spawn flash ring
    const ring = this.add.circle(p.x, p.y-25, 5, glowCol, 1).setDepth(20);
    this.tweens.add({ targets: ring, scaleX: 6, scaleY: 6, alpha: 0, duration: 500, ease: 'Power2', onComplete: () => ring.destroy() });

    body.setAlpha(0); head.setAlpha(0);
    this.tweens.add({ targets: [body, head, outline], alpha: 1, duration: 350, ease: 'Power2' });
  }

  _onHit(d) {
    const state = getState();
    if (!state?.players) return;

    // Find defender
    state.players.forEach((p, sid) => {
      if (p.playerId !== d.defenderId) return;
      const g = this.fighters.get(sid);
      if (!g) return;

      // Flash white
      const origCol = this.order.indexOf(sid) === 0 ? 0x3377ee : 0xee3333;
      g.body.setFillStyle(0xffffff); g.head.setFillStyle(0xffffff);
      this.time.delayedCall(80, () => { g.body.setFillStyle(origCol); g.head.setFillStyle(origCol); });

      // Screen shake on hit
      this.cameras.main.shake(80, 0.004);
    });

    // Hit particles at approx position
    const hx = 400, hy = GY - 80;
    for (let i = 0; i < 8; i++) {
      const col = d.type === 'critical' ? 0xffff00 : d.type === 'blocked' ? 0x6666ff : 0xff6644;
      const pt = this.add.rectangle(hx + Phaser.Math.Between(-15,15), hy + Phaser.Math.Between(-15,15), 5, 5, col).setDepth(22);
      this.tweens.add({ targets: pt, x: pt.x + Phaser.Math.Between(-50,50), y: pt.y + Phaser.Math.Between(-60,10), alpha: 0, duration: 450, ease: 'Power2', onComplete: () => pt.destroy() });
    }

    // Damage number
    const dmgColor = d.type === 'critical' ? '#ffff00' : d.type === 'blocked' ? '#aaaaff' : '#ff8866';
    const dmgSize  = d.type === 'critical' ? '24px' : '17px';
    const dmgTxt = this.add.text(hx + Phaser.Math.Between(-25,25), hy, '-' + d.damage, { fontSize: dmgSize, color: dmgColor, fontStyle:'bold', stroke:'#000', strokeThickness:3 }).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: dmgTxt, y: dmgTxt.y - 55, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => dmgTxt.destroy() });

    if (d.type === 'critical') { this.cameras.main.shake(200, 0.01); this._flash('CRITICAL!', '#ffff00', 38); }
    else if (d.type === 'blocked') this._flash('BLOCK!', '#aaaaff', 28);
  }

  _countdown(n) {
    const W = this.scale.width;
    const show = (num) => {
      const t = this.add.text(W/2, 185, num > 0 ? String(num) : 'FIGHT!', { fontSize:'96px', color: num > 0 ? '#ffffff' : '#e94560', fontStyle:'bold', stroke:'#000', strokeThickness:8 }).setOrigin(0.5).setDepth(30).setScale(0.4).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.out',
        onComplete: () => this.tweens.add({ targets: t, alpha: 0, scaleX: 1.4, scaleY: 1.4, duration: 550, delay: 350,
          onComplete: () => { t.destroy(); if (n > 1) { n--; this.time.delayedCall(60, () => show(n)); } else this.time.delayedCall(60, () => show(0)); } }) });
    };
    show(n);
  }

  _flash(msg, color, size) {
    const W = this.scale.width;
    const t = this.add.text(W/2, 170, msg, { fontSize: (size||48)+'px', color, fontStyle:'bold', stroke:'#000', strokeThickness:6 }).setOrigin(0.5).setDepth(26).setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.out',
      onComplete: () => this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, duration: 900, delay: 400, ease: 'Power2', onComplete: () => t.destroy() }) });
  }

  cleanup() { this.events.emit('shutdown'); }
}
