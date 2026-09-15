import Phaser from 'phaser';
export class LobbyScene extends Phaser.Scene {
  constructor() { super({ key: 'Lobby' }); }
  create() {
    const W = this.scale.width, H = this.scale.height;

    // Dark gradient background
    this.add.rectangle(W/2, H/2, W, H, 0x08080f);

    // Stars
    for (let i = 0; i < 100; i++) {
      const star = this.add.circle(Phaser.Math.Between(0,W), Phaser.Math.Between(0,H), Phaser.Math.FloatBetween(0.3,2.2), 0xffffff, Phaser.Math.FloatBetween(0.1,0.9));
      this.tweens.add({ targets: star, alpha: Phaser.Math.FloatBetween(0.05,0.2), duration: Phaser.Math.Between(1000,4000), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0,3000) });
    }

    // Decorative lines
    this.add.rectangle(W/2, H-60, W, 1, 0xe94560, 0.3);
    this.add.rectangle(W/2, H-58, W, 1, 0xe94560, 0.1);

    // Title glow effect
    const glowRect = this.add.rectangle(W/2, H/2-72, 380, 80, 0xe94560, 0.05);
    this.tweens.add({ targets: glowRect, alpha: 0.02, duration: 1500, yoyo: true, repeat: -1 });

    // ARCADE text
    const titleA = this.add.text(W/2, H/2-95, 'ARCADE', {
      fontSize:'68px', color:'#e94560', fontStyle:'bold', stroke:'#000', strokeThickness:8,
      shadow: { offsetX:0, offsetY:0, color:'#e94560', blur:30, fill:true },
    }).setOrigin(0.5);

    const titleB = this.add.text(W/2, H/2-32, 'STRIKE', {
      fontSize:'42px', color:'#ffffff', fontStyle:'bold', stroke:'#000', strokeThickness:5,
    }).setOrigin(0.5);

    // Subtle title animation
    this.tweens.add({ targets: titleA, y: titleA.y - 4, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Divider
    this.add.rectangle(W/2, H/2+4, 200, 1, 0xe94560, 0.5);

    this.add.text(W/2, H/2+18, '1v1 ONLINE FIGHTING', { fontSize:'12px', color:'#555577', letterSpacing:4 }).setOrigin(0.5);

    // Controls
    this.add.text(W/2, H/2+48, 'Arrow Keys: Move / Jump     Z: Attack     X: Block', { fontSize:'12px', color:'#333355' }).setOrigin(0.5);

    // Play button
    const btnBg = this.add.rectangle(W/2, H/2+105, 230, 54, 0x0d0d1a).setInteractive({ useHandCursor:true }).setStrokeStyle(2, 0xe94560, 0.8);
    const btnTxt = this.add.text(W/2, H/2+105, 'FIND MATCH', { fontSize:'22px', color:'#ffffff', fontStyle:'bold', letterSpacing:2 }).setOrigin(0.5);

    btnBg.on('pointerover', () => { btnBg.setFillStyle(0xe94560); btnBg.setStrokeStyle(2, 0xff6688); btnTxt.setStyle({ color:'#000000' }); });
    btnBg.on('pointerout',  () => { btnBg.setFillStyle(0x0d0d1a); btnBg.setStrokeStyle(2, 0xe94560, 0.8); btnTxt.setStyle({ color:'#ffffff' }); });
    btnBg.on('pointerdown', () => { btnTxt.setText('SEARCHING...'); this.scene.start('Queue'); });

    // Pulse
    this.tweens.add({ targets: btnBg, scaleX:1.03, scaleY:1.03, duration:1000, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });

    this.add.text(W-8, H-8, 'v1.0 BETA', { fontSize:'10px', color:'#222233' }).setOrigin(1,1);
    this.add.text(8, H-8, 'arcadestrike.onrender.com', { fontSize:'10px', color:'#222233' }).setOrigin(0,1);
  }
}
