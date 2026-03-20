import * as Phaser from 'phaser';

export type TileClickHandler = (tileId: number) => Promise<boolean | void>;

export interface MinesGameConfig {
  containerId: string;
  onTileClick: TileClickHandler;
}

export class MinesScene extends Phaser.Scene {
  private onTileClick: TileClickHandler;

  constructor(onTileClick: TileClickHandler) {
    super('MinesScene');
    this.onTileClick = onTileClick;
  }

  preload(): void {

    this.load.audio('reveal', 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
    this.load.audio('explosion', 'https://assets.mixkit.co/active_storage/sfx/1696/1696-preview.mp3');
    this.load.audio('cashout', 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    
    this.load.image('tile', '/assets/tile.png');
    this.load.image('gem', '/assets/gem.png');
    this.load.image('bomb', '/assets/bomb.png');
  }

  create(): void {
    const GRID_SIZE = 5;
    const TILE_SPACING = 100;

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const x = (i % GRID_SIZE) * TILE_SPACING + 50;
      const y = Math.floor(i / GRID_SIZE) * TILE_SPACING + 50;
      
      const tile = this.add.sprite(x, y, 'tile').setInteractive();
      tile.setData('id', i);

      tile.on('pointerdown', async () => {
        tile.disableInteractive();
        const isHit = await this.onTileClick(i);
        if (isHit) {
          tile.setTexture('bomb');
          // Add a little shake effect when hitting a bomb!
          this.cameras.main.shake(200, 0.02);
        } else {
          tile.setTexture('gem');
        }
      });
    }

    // Listen for the custom "reveal-board" event from React
    this.game.events.on('reveal-board', (minePositions: number[]) => {
      this.children.list.forEach((child) => {
        const sprite = child as Phaser.GameObjects.Sprite;
        // Only flip tiles that haven't been clicked yet
        if (sprite.texture.key === 'tile') {
          const id = sprite.getData('id');
          if (minePositions.includes(id)) {
            // Unclicked mines appear slightly dimmed
            sprite.setTexture('bomb').setAlpha(0.6).setTint(0xffaaaa);
          } else {
            // Unclicked gems appear slightly dimmed
            sprite.setTexture('gem').setAlpha(0.6).setTint(0xaaffaa);
          }
        }
        // Disable all clicks once the board is revealed
        sprite.disableInteractive();
      });
    });
  }
}

export const initMinesGame = (config: MinesGameConfig): Phaser.Game => {
  const PhaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: config.containerId,
    // Add mobile responsiveness scaling!
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 500,
      height: 500,
    },
    backgroundColor: '#020617',
    scene: new MinesScene(config.onTileClick),
  };

  return new Phaser.Game(PhaserConfig);
};
