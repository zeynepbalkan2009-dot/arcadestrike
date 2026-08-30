import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() { super({ key: 'Result' }); }
  create(data: { winnerId?: string; loserId?: string; reason?: string }) {
    const { width, height } = this.scale;
    this.add.text(width/2, height/2-100, 'MATCH OVER', { fontSize:'52px', color:'#e94560', fontStyle:'bold', stroke:'#000', strokeThickness:4 }).setOrigin(0.5);
    if (data.winnerId) {
      this.add.text(width/2, height/2-20, `Winner: ${data.winnerId}`, { fontSize:'26px', color:'#fff' }).setOrigin(0.5);
    }
    if (data.reason === 'disconnect') {
      this.add.text(width/2, height/2+20, 'Opponent disconnected', { fontSize:'16px', color:'#888' }).setOrigin(0.5);
    }
    const btn = this.add.text(width/2, height/2+80, '[ PLAY AGAIN ]', { fontSize:'26px', color:'#fff', stroke:'#e94560', strokeThickness:2 })
      .setOrigin(0.5).setInteractive({ useHandCursor:true });
    btn.on('pointerover',  () => btn.setStyle({ color:'#e94560' }));
    btn.on('pointerout',   () => btn.setStyle({ color:'#fff' }));
    btn.on('pointerdown',  () => this.scene.start('Queue'));

    const home = this.add.text(width/2, height/2+120, '[ MAIN MENU ]', { fontSize:'18px', color:'#555' })
      .setOrigin(0.5).setInteractive({ useHandCursor:true });
    home.on('pointerdown', () => this.scene.start('Lobby'));
  }
}
