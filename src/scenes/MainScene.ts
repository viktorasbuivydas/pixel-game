import * as PIXI from "pixi.js";
import { Assets, Sprite } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MenuScene } from "./MenuScene";
import { Ui } from "./mainScene/Ui";
// @ts-ignore - Vite handles image imports
import tile01Url from "../assets/PNG/PNG/Ground_Tile_01_C.png";
import tile02Url from "../assets/PNG/PNG/Ground_Tile_02_C.png";
import tankBody from "../assets/PNG/Hulls_Color_A/Hull_01.png";
import tankGun from "../assets/PNG/Weapon_Color_A/Gun_01.png";
import { PlayerMovement } from "../core/PlayerMovement";

export class MainScene extends Scene {
  private viewport: Viewport;
  private ui: Ui;
  private level: number = 1;
  private playerMovement: PlayerMovement | undefined;
  private tankSprite: Sprite | undefined;
  private tankGunSprite: Sprite | undefined;

  async initialize(): Promise<void> {
    const app = window.app as PIXI.Application;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Create UI
    this.ui = new Ui(screenWidth, screenHeight);
    this.ui.setLevel(this.level);

    // Handle "MENU" button
    this.ui.onBack(() => {
      const menuScene = new MenuScene();
      menuScene.initialize();
      SceneManager.changeScene(menuScene);
    });

    // Create viewport
    this.viewport = new Viewport({
      screenHeight: 1000,
      screenWidth: 1000,
      worldWidth: 256 * 100,
      worldHeight: 256 * 100,
      events: app.renderer.events, // needed for drag, wheel etc
    });

    // Enable camera interaction plugins
    this.viewport.drag().pinch().wheel().decelerate();

    // Load ground tile texture
    const groundTexture = await Assets.load(tile01Url);
    const groundTexture2 = await Assets.load(tile02Url);
    // Create a 100x100 grid of ground tiles
    const tilesX = 258 / 4;
    const tilesY = 258 / 4;

    for (let i = 0; i < tilesX; i++) {
      for (let j = 0; j < tilesY; j++) {
        // Randomize each tile's texture
        const tile = new Sprite(
          Math.random() > 0.9 ? groundTexture : groundTexture2
        );
        // Scale down by half
        tile.scale.set(0.25, 0.25);
        // Take into account the scale so the tile/grid remains seamless
        tile.x = i * 64;
        tile.y = j * 64;
        this.viewport.addChild(tile);
      }
    }

    // Load tank body and gun textures and create sprites
    const tankTexture = await Assets.load(tankBody);
    const tankSprite = new Sprite(tankTexture);
    // Scale down by half
    tankSprite.scale.set(0.25, 0.25);
    tankSprite.x = 1024;
    tankSprite.y = 1024;
    tankSprite.anchor.set(0.5);

    this.tankSprite = tankSprite;
    this.viewport.addChild(tankSprite);

    const tankGunTexture = await Assets.load(tankGun);
    const tankGunSprite = new Sprite(tankGunTexture);
    // Scale down by half
    tankGunSprite.scale.set(0.25, 0.25);
    tankGunSprite.anchor.set(0.5);
    tankGunSprite.x = 100;
    tankGunSprite.y = 100;
    tankGunSprite.rotation = 0;

    this.tankGunSprite = tankGunSprite;
    this.viewport.addChild(tankGunSprite);

    // Add everything to scene
    this.addChild(this.ui);
    this.addChild(this.viewport);

    // Implement player movement
    this.playerMovement = new PlayerMovement(
      app,
      this.tankSprite,
      this.tankGunSprite
    );

    // Make camera follow the player tank
    this.viewport.follow(this.tankSprite, { speed: 0 });
  }

  update(deltaTime: number): void {
    // Call PlayerMovement's update to allow player control
    this.playerMovement?.update(deltaTime);
    // After movement, follow tank
    if (this.tankSprite && this.viewport) {
      this.viewport.follow(this.tankSprite, { speed: 0 });
    }
  }

  destroy(): void {
    this.ui.destroy();
    this.removeChildren();
    this.viewport?.destroy();
  }
}
