import Phaser from 'phaser';

export class LobbyScene extends Phaser.Scene {
  constructor() { super({ key: 'Lobby' }); }
  create() {
    const { width, height } = this.scale;
    this.add.text(width/2, height/2-80, 'ARCADE STRIKE', {
      fontSize:'52px', color:'#e94560', fontStyle:'bold', stroke:'#000',strokeThickness:4,
    }).setOrigin(0.5);
    this.add.text(width/2, height/2-20, '1v1 Fighting Game', { fontSize:'18px', color:'#888' }).setOrigin(0.5);

    const controls = [
      '← → : Move   ↑ : Jump',
      'Z : Attack   X : Block',
    ];
    controls.forEach((t, i) =>
      this.add.text(width/2, height/2+30+i*24, t, { fontSize:'14px', color:'#aaa' }).setOrigin(0.5)
    );

    const btn = this.add.text(width/2, height/2+110, '[ FIND MATCH ]', {
      fontSize:'28px', color:'#fff', stroke:'#e94560', strokeThickness:2,
    }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    btn.on('pointerover',  () => btn.setStyle({ color:'#e94560' }));
    btn.on('pointerout',   () => btn.setStyle({ color:'#fff' }));
    btn.on('pointerdown',  () => this.scene.start('Queue'));

    // Decorative stars
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width), y = Phaser.Math.Between(0, height);
      const s = Phaser.Math.FloatBetween(1, 3);
      this.add.circle(x, y, s, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
    }
  }
}
