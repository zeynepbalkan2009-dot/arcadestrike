import Phaser from 'phaser';
export class ResultScene extends Phaser.Scene {
  constructor() { super({ key: 'Result' }); }
  create(data) {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(W/2, H/2, W, H, 0x08080f);
    for (let i=0;i<80;i++) {
      const s = this.add.circle(Phaser.Math.Between(0,W),Phaser.Math.Between(0,H),Phaser.Math.FloatBetween(0.3,2),0xffffff,Phaser.Math.FloatBetween(0.05,0.6));
      this.tweens.add({targets:s,alpha:0.02,duration:Phaser.Math.Between(800,3000),yoyo:true,repeat:-1,delay:Phaser.Math.Between(0,2000)});
    }

    // Banner
    const banner = this.add.rectangle(W/2, H/2-80, W, 100, 0xe94560, 0.1);
    this.tweens.add({ targets: banner, alpha: 0.05, duration: 1000, yoyo: true, repeat: -1 });
    this.add.rectangle(W/2, H/2-30, W, 1, 0xe94560, 0.3);
    this.add.rectangle(W/2, H/2-130, W, 1, 0xe94560, 0.3);

    const title = this.add.text(W/2, H/2-92, 'MATCH OVER', {
      fontSize:'52px', color:'#e94560', fontStyle:'bold', stroke:'#000', strokeThickness:6,
    }).setOrigin(0.5).setAlpha(0).setScale(0.5);
    this.tweens.add({ targets: title, alpha: 1, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.out' });

    if (data.winnerId) {
      this.time.delayedCall(300, () => {
        const w = this.add.text(W/2, H/2-30, '\uD83C\uDFC6  ' + data.winnerId + '  WINS!', {
          fontSize:'28px', color:'#ffffff', fontStyle:'bold', stroke:'#000', strokeThickness:4,
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: w, alpha: 1, duration: 400 });
      });
    }
    if (data.reason === 'disconnect') {
      this.add.text(W/2, H/2+15, 'Opponent disconnected', { fontSize:'14px', color:'#555577' }).setOrigin(0.5);
    }

    this.time.delayedCall(500, () => {
      this._btn(W/2, H/2+80, 'PLAY AGAIN', () => this.scene.start('Queue'));
      this._btn(W/2, H/2+132, 'MAIN MENU',  () => this.scene.start('Lobby'));
    });

    // Confetti for winner
    if (data.winnerId) {
      this.time.delayedCall(200, () => {
        for (let i=0;i<40;i++) {
          const c = this.add.rectangle(Phaser.Math.Between(0,W), -10, Phaser.Math.Between(4,8), Phaser.Math.Between(4,8), Phaser.Math.Between(0,0xffffff)).setDepth(20);
          this.tweens.add({ targets:c, y: H+20, x: c.x+Phaser.Math.Between(-80,80), angle: Phaser.Math.Between(-360,360), duration: Phaser.Math.Between(1200,2800), delay: Phaser.Math.Between(0,800), ease:'Power1', onComplete:()=>c.destroy() });
        }
      });
    }
  }
  _btn(x, y, label, cb) {
    const bg = this.add.rectangle(x, y, 210, 46, 0x0d0d1a).setInteractive({ useHandCursor:true }).setStrokeStyle(2, 0xe94560, 0.7).setAlpha(0);
    const txt = this.add.text(x, y, label, { fontSize:'18px', color:'#ffffff', fontStyle:'bold', letterSpacing:1 }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets:[bg,txt], alpha:1, duration:300 });
    bg.on('pointerover', () => { bg.setFillStyle(0xe94560); txt.setStyle({ color:'#000000' }); });
    bg.on('pointerout',  () => { bg.setFillStyle(0x0d0d1a); txt.setStyle({ color:'#ffffff' }); });
    bg.on('pointerdown', cb);
  }
}
