import Phaser from 'phaser';
import { joinMatchmaking, leaveRoom, on, off } from '../network/NetworkManager';

export class QueueScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private timerText!:  Phaser.GameObjects.Text;
  private dots = 0;
  private dotTimer = 0;
  private elapsed  = 0;

  constructor() { super({ key: 'Queue' }); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    for (let i = 0; i < 60; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(0.5, 2), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.5)
      );
    }

    this.add.text(W/2, H/2 - 100, 'MATCHMAKING', {
      fontSize: '38px', color: '#e94560', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.statusText = this.add.text(W/2, H/2 - 30, 'Searching for opponent', {
      fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);

    this.timerText = this.add.text(W/2, H/2 + 10, '0:00', {
      fontSize: '14px', color: '#555555',
    }).setOrigin(0.5);

    // Spinning indicator
    const ring = this.add.graphics();
    ring.lineStyle(3, 0xe94560, 1);
    ring.strokeCircle(W/2, H/2 + 55, 22);
    const dot = this.add.circle(W/2, H/2 + 33, 5, 0xe94560);
    this.tweens.add({ targets: dot, angle: 360, duration: 1000, repeat: -1,
      onUpdate: (t) => {
        const a = Phaser.Math.DegToRad(t.progress * 360);
        dot.setPosition(W/2 + Math.sin(a) * 22, H/2 + 55 + Math.cos(a) * -22);
      }
    });

    // Cancel
    const cancel = this.add.text(W/2, H/2 + 110, '[ CANCEL ]', {
      fontSize: '16px', color: '#444444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancel.on('pointerover',  () => cancel.setStyle({ color: '#ffffff' }));
    cancel.on('pointerout',   () => cancel.setStyle({ color: '#444444' }));
    cancel.on('pointerdown',  () => leaveRoom().then(() => this.scene.start('Lobby')));

    // Network handlers
    const onCountdown  = (d: any) => { this.cleanup(); this.scene.start('Fight', { countdown: d.seconds }); };
    const onDisconnect = ()       => { this.cleanup(); this.scene.start('Lobby'); };
    on('countdown',    onCountdown);
    on('disconnected', onDisconnect);
    this.events.once('shutdown', () => { off('countdown', onCountdown); off('disconnected', onDisconnect); });

    // Join queue
    const playerId = 'p-' + Math.random().toString(36).slice(2, 9);
    const names    = ['Shadow','Blaze','Nova','Raven','Storm','Apex','Fury','Vex'];
    const name     = names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 999);
    joinMatchmaking(playerId, name, 1000).catch(() => {
      this.statusText.setText('Connection failed — retrying...');
      this.time.delayedCall(2000, () => this.scene.start('Lobby'));
    });
  }

  update(_t: number, dt: number) {
    this.elapsed  += dt;
    this.dotTimer += dt;

    if (this.dotTimer >= 500) {
      this.dotTimer = 0;
      this.dots = (this.dots + 1) % 4;
      this.statusText.setText('Searching for opponent' + '.'.repeat(this.dots));
    }

    const s = Math.floor(this.elapsed / 1000);
    this.timerText.setText(`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`);
  }

  private cleanup() { this.events.emit('shutdown'); }
}
