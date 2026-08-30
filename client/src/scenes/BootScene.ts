import Phaser from 'phaser';
import { initNetwork } from '../network/NetworkManager';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }
  create() {
    initNetwork();
    this.scene.start('Lobby');
  }
}
