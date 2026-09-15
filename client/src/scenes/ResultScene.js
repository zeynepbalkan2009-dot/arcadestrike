import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() { super({ key: 'Result' }); }

  create(data) {
    const W = 800, H = 450;  // hardcoded — same as game config
    const winnerId = data?.winnerId ?? null;
    const reason   = data?.reason   ?? '';

    // Force camera reset
    this.cameras.main.setBackgroundColor('#08080f');
    this.cameras.main.fadeIn(300);

    // Stars
    for (let i = 0; i < 80; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(0.3, 2), 0xffffff, Phaser.Math.FloatBetween(0.05, 0.6)
      );
      this.tweens.add({ targets: s, alpha: 0.02, duration: Phaser.Math.Between(800,3000), yoyo:true, repeat:-1, delay: Phaser.Math.Between(0,2000) });
    }

    // Banner lines
    this.add.rectangle(W/2, H/2-130, W, 1, 0xe94560, 0.3);
    this.add.rectangle(W/2, H/2-30,  W, 1, 0xe94560, 0.3);
    this.add.rectangle(W/2, H/2-80, W, 100, 0xe94560, 0.08);

    // MATCH OVER
    const title = this.add.text(W/2, H/2-90, 'MATCH OVER', {
      fontSize: '52px', color: '#e94560', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 500, ease: 'Power2' });

    // Winner or Draw
    this.time.delayedCall(300, () => {
      const msg  = winnerId ? ('\uD83C\uDFC6  ' + winnerId + '  WINS!') : 'DRAW!';
      const col  = winnerId ? '#ffffff' : '#ffff00';
      const wt = this.add.text(W/2, H/2-28, msg, {
        fontSize: '28px', color: col, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: wt, alpha: 1, duration: 400 });
    });

    if (reason === 'disconnect') {
      this.add.text(W/2, H/2+18, 'Opponent disconnected', {
        fontSize: '14px', color: '#555577',
      }).setOrigin(0.5);
    }

    // Buttons
    this.time.delayedCall(600, () => {
      this._btn(W/2, H/2+80,  'PLAY AGAIN', () => {
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start('Queue'));
      });
      this._btn(W/2, H/2+136, 'MAIN MENU', () => {
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start('Lobby'));
      });
    });

    // Confetti for winner
    if (winnerId) {
      this.time.delayedCall(300, () => {
        for (let i = 0; i < 50; i++) {
          const c = this.add.rectangle(
            Phaser.Math.Between(0, W), -12,
            Phaser.Math.Between(4, 9), Phaser.Math.Between(4, 9),
            Phaser.Math.Between(0, 0xffffff)
          ).setDepth(20);
          this.tweens.add({
            targets: c, y: H+20,
            x: c.x + Phaser.Math.Between(-80, 80),
            angle: Phaser.Math.Between(-360, 360),
            duration: Phaser.Math.Between(1200, 2800),
            delay: Phaser.Math.Between(0, 800),
            ease: 'Power1',
            onComplete: () => c.destroy(),
          });
        }
      });
    }

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Lobby'));
  }

  _btn(x, y, label, cb) {
    const bg = this.add.rectangle(x, y, 210, 48, 0x0d0d1a)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xe94560, 0.8)
      .setAlpha(0);
    const txt = this.add.text(x, y, label, {
      fontSize: '19px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: [bg, txt], alpha: 1, duration: 300 });

    bg.on('pointerover',  () => { bg.setFillStyle(0xe94560); txt.setStyle({ color: '#000000' }); });
    bg.on('pointerout',   () => { bg.setFillStyle(0x0d0d1a); txt.setStyle({ color: '#ffffff' }); });
    bg.on('pointerdown',  cb);
  }
}
