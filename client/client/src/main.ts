import Phaser from 'phaser';
import { BootScene }   from './scenes/BootScene';
import { LobbyScene }  from './scenes/LobbyScene';
import { QueueScene }  from './scenes/QueueScene';
import { FightScene }  from './scenes/FightScene';
import { ResultScene } from './scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type:            Phaser.AUTO,
  width:           800,
  height:          450,
  backgroundColor: '#0f0f1a',
  parent:          'game-container',
  scene:           [BootScene, LobbyScene, QueueScene, FightScene, ResultScene],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 400, height: 225 },
    max: { width: 1600, height: 900 },
  },
  fps: { target: 60, forceSetTimeOut: false },
};

new Phaser.Game(config);
