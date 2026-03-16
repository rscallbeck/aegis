import Phaser from 'phaser';

/**
 * Interface for the callback function when a tile is clicked.
 */
type TileClickHandler = (tileId: number) => Promise<boolean | void>;

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
    // Ensure these assets exist in your /public/assets folder
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
        // Disable interaction immediately to prevent double-clicks
        tile.disableInteractive();
        const isHit = await this.onTileClick(i);
        
        // Handle visual feedback based on the server response
        if (isHit) {
          tile.setTexture('bomb');
        } else {
          tile.setTexture('gem');
        }
      });
    }
  }

  // Inside MinesScene class
  public async playWinSequence(minePositions: number[]): Promise<void> {
    // 1. Dim the board slightly
    this.cameras.main.flash(500, 0, 255, 0, false); // Green flash

    // 2. Reveal all un-clicked mines as semi-transparent
    minePositions.forEach((pos) => {
      const tile = this.children.list.find(child => child.getData('id') === pos) as Phaser.GameObjects.Sprite;
      if (tile && tile.texture.key === 'tile') {
        tile.setTexture('bomb').setAlpha(0.5);
      }
    });

    // 3. Add a "Winner" text or particle effect
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'CASHED OUT!', {
      fontSize: '48px',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);
  }

}

export const initMinesGame = (config: MinesGameConfig): Phaser.Game => {
  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: config.containerId,
    width: 500,
    height: 500,
    transparent: true,
    scene: new MinesScene(config.onTileClick),
  };

  return new Phaser.Game(phaserConfig);
};
