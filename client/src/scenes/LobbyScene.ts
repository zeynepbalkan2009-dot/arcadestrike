import Phaser from 'phaser';

export class LobbyScene extends Phaser.Scene {
  constructor() { super({ key: 'Lobby' }); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background stars
    for (let i = 0; i < 80; i++) {
      const x   = Phaser.Math.Between(0, W);
      const y   = Phaser.Math.Between(0, H);
      const r   = Phaser.Math.FloatBetween(0.5, 2.5);
      const a   = Phaser.Math.FloatBetween(0.2, 0.9);
      this.add.circle(x, y, r, 0xffffff, a);
    }

    // Ground line
    this.add.rectangle(W / 2, H - 40, W, 3, 0xe94560, 0.6);

    // Title
    this.add.text(W / 2, H / 2 - 100, 'ARCADE', {
      fontSize: '64px', color: '#e94560', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 6, shadow: { blur: 20, color: '#e94560', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 40, 'STRIKE', {
      fontSize: '36px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 + 10, '— 1v1 ONLINE FIGHTING —', {
      fontSize: '13px', color: '#666666', letterSpacing: 3,
    }).setOrigin(0.5);

    // Controls
    const controls = 'Arrow Keys: Move / Jump     Z: Attack     X: Block';
    this.add.text(W / 2, H / 2 + 45, controls, {
      fontSize: '12px', color: '#444444',
    }).setOrigin(0.5);

    // Play button
    const btnBg = this.add.rectangle(W / 2, H / 2 + 100, 220, 50, 0xe94560, 0)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xe94560);
    const btnTxt = this.add.text(W / 2, H / 2 + 100, 'FIND MATCH', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerover',  () => { btnBg.setFillStyle(0xe94560, 0.3); });
    btnBg.on('pointerout',   () => { btnBg.setFillStyle(0xe94560, 0); });
    btnBg.on('pointerdown',  () => {
      btnTxt.setText('SEARCHING...');
      this.scene.start('Queue');
    });

    // Pulse animation on title
    this.tweens.add({
      targets: btnBg,
      scaleX: 1.03, scaleY: 1.03,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Version
    this.add.text(W - 8, H - 8, 'v1.0 BETA', {
      fontSize: '10px', color: '#333333',
    }).setOrigin(1, 1);
  }
}
