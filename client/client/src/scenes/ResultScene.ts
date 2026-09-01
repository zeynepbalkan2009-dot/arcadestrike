import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() { super({ key: 'Result' }); }

  create(data: { winnerId?: string; loserId?: string; reason?: string }) {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    this.add.rectangle(W/2, H/2, W, H, 0x0a0a14);
    for (let i = 0; i < 60; i++) {
      this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.FloatBetween(0.5, 2), 0xffffff, Phaser.Math.FloatBetween(0.05, 0.4)
      );
    }

    // Victory banner
    this.add.rectangle(W/2, H/2-80, W, 100, 0xe94560, 0.15);
    this.add.text(W/2, H/2-95, 'MATCH OVER', {
      fontSize: '52px', color: '#e94560', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    if (data.winnerId) {
      this.add.text(W/2, H/2-20, `🏆  ${data.winnerId}  WINS`, {
        fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    if (data.reason === 'disconnect') {
      this.add.text(W/2, H/2+20, 'Opponent disconnected', {
        fontSize: '15px', color: '#666666',
      }).setOrigin(0.5);
    }

    // Buttons
    this._makeBtn(W/2, H/2+85, 'PLAY AGAIN', () => this.scene.start('Queue'));
    this._makeBtn(W/2, H/2+135, 'MAIN MENU',  () => this.scene.start('Lobby'));

    // Confetti effect for winner
    if (data.winnerId) {
      for (let i = 0; i < 30; i++) {
        const c = this.add.rectangle(
          Phaser.Math.Between(0, W), Phaser.Math.Between(-20, 0),
          6, 6, Phaser.Math.Between(0, 0xffffff)
        );
        this.tweens.add({
          targets: c, y: H + 20,
          x: c.x + Phaser.Math.Between(-60, 60),
          duration: Phaser.Math.Between(1500, 3000),
          delay: Phaser.Math.Between(0, 1000),
          ease: 'Power1',
          onComplete: () => c.destroy(),
        });
      }
    }
  }

  private _makeBtn(x: number, y: number, label: string, cb: () => void) {
    const bg = this.add.rectangle(x, y, 200, 42, 0xe94560, 0)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xe94560);
    const txt = this.add.text(x, y, label, { fontSize:'18px', color:'#ffffff', fontStyle:'bold' }).setOrigin(0.5);
    bg.on('pointerover',  () => bg.setFillStyle(0xe94560, 0.3));
    bg.on('pointerout',   () => bg.setFillStyle(0xe94560, 0));
    bg.on('pointerdown',  cb);
    this.tweens.add({ targets: [bg, txt], y: y+2, duration: 100, paused: false,
      onStart: () => {}, repeat: 0 });
  }
}
