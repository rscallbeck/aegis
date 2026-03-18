import Phaser from 'phaser';

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
    // Note: You must place these 3 image files in your /public/assets folder!
    this.load.image('tile', '/assets/tile.png');
    this.load.image('gem', '/assets/gem.png');
    this.load.image('bomb', '/assets/bomb.png');
  }

  create(): void {
    const GRID_SIZE = 5;
    const TILE_SPACING = 100;

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      // Calculate x and y coordinates to center the 5x5 grid in the 500x500 canvas
      const x = (i % GRID_SIZE) * TILE_SPACING + 50;
      const y = Math.floor(i / GRID_SIZE) * TILE_SPACING + 50;
      
      const tile = this.add.sprite(x, y, 'tile').setInteractive();
      tile.setData('id', i);

      tile.on('pointerdown', async () => {
        // Disable interaction immediately to prevent double-clicks
        tile.disableInteractive();
        
        // Wait for the Supabase Edge Function to respond
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

  public async playWinSequence(minePositions: number[]): Promise<void> {
    // 1. Flash the board green
    this.cameras.main.flash(500, 0, 255, 0, false); 

    // 2. Reveal all un-clicked mines as semi-transparent to prove fairness
    minePositions.forEach((pos) => {
      const tile = this.children.list.find(child => child.getData('id') === pos) as Phaser.GameObjects.Sprite;
      if (tile && tile.texture.key === 'tile') {
        tile.setTexture('bomb').setAlpha(0.5);
      }
    });

    // 3. Add the cash-out text overlay
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
    backgroundColor: '#020617', // Slate-950 to blend perfectly with your Tailwind UI
    scene: new MinesScene(config.onTileClick),
  };

  return new Phaser.Game(phaserConfig);
};
