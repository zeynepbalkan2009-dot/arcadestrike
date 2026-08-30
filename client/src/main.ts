import Phaser from 'phaser';
import { BootScene }   from './scenes/BootScene';
import { LobbyScene }  from './scenes/LobbyScene';
import { QueueScene }  from './scenes/QueueScene';
import { FightScene }  from './scenes/FightScene';
import { ResultScene } from './scenes/ResultScene';

new Phaser.Game({
  type:   Phaser.AUTO,
  width:  800,
  height: 450,
  backgroundColor: '#0f0f1a',
  parent: 'game-container',
  scene:  [BootScene, LobbyScene, QueueScene, FightScene, ResultScene],
  scale: {
    mode:      Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
