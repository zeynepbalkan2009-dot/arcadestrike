import Phaser from 'phaser';
import { joinMatchmaking, leaveRoom, on, off } from '../network/NetworkManager';

export class QueueScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private dots = 0;
  private dotTimer = 0;

  constructor() { super({ key: 'Queue' }); }

  create() {
    const { width, height } = this.scale;
    this.add.text(width/2, height/2-80, 'MATCHMAKING', { fontSize:'36px', color:'#e94560', fontStyle:'bold' }).setOrigin(0.5);
    this.statusText = this.add.text(width/2, height/2-20, 'Searching...', { fontSize:'20px', color:'#aaa' }).setOrigin(0.5);

    const cancel = this.add.text(width/2, height/2+60, '[ CANCEL ]', { fontSize:'18px', color:'#666' })
      .setOrigin(0.5).setInteractive({ useHandCursor:true });
    cancel.on('pointerover', () => cancel.setStyle({ color:'#fff' }));
    cancel.on('pointerout',  () => cancel.setStyle({ color:'#666' }));
    cancel.on('pointerdown', () => leaveRoom().then(() => this.scene.start('Lobby')));

    const onCountdown = (d: any) => { this.cleanup(); this.scene.start('Fight', { countdown: d.seconds }); };
    const onError     = () => { this.cleanup(); this.scene.start('Lobby'); };

    on('countdown',    onCountdown);
    on('disconnected', onError);
    this.events.once('shutdown', () => { off('countdown', onCountdown); off('disconnected', onError); });

    const playerId = 'player-' + Math.random().toString(36).slice(2, 8);
    const name     = 'Fighter' + Math.floor(Math.random() * 9999);
    joinMatchmaking(playerId, name).catch(e => {
      console.error('[Queue]', e);
      this.statusText.setText('Connection failed');
      this.time.delayedCall(2000, () => this.scene.start('Lobby'));
    });
  }

  update(_t: number, dt: number) {
    this.dotTimer += dt;
    if (this.dotTimer >= 500) { this.dotTimer = 0; this.dots = (this.dots + 1) % 4; this.statusText.setText('Searching' + '.'.repeat(this.dots)); }
  }

  private cleanup() { this.events.emit('shutdown'); }
}
