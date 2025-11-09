import * as PIXI from "pixi.js";
import { Sprite } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MenuScene } from "./MenuScene";
import { Ui } from "./mainScene/Ui";
import { PlayerMovement } from "../core/PlayerMovement";
import { GroundManager } from "../core/GroundManager";
import { TankFactory } from "../core/TankFactory";
import { ViewportManager } from "../core/ViewportManager";
// @ts-ignore - Vite handles image imports
import tile01Url from "../assets/PNG/PNG/Ground_Tile_01_C.png";
import tile02Url from "../assets/PNG/PNG/Ground_Tile_02_C.png";
import tankBody from "../assets/PNG/Hulls_Color_A/Hull_01.png";
import tankGun from "../assets/PNG/Weapon_Color_A/Gun_01.png";

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
    this.viewport = ViewportManager.create(app, {
      screenWidth: 1000,
      screenHeight: 1000,
      worldWidth: 256 * 100,
      worldHeight: 256 * 100,
    });

    // Generate ground tiles
    const tilesX = 258 / 4;
    const tilesY = 258 / 4;
    const tileSize = 64;
    const tileScale = 0.25;

    const groundManager = new GroundManager(this.viewport, {
      tilesX,
      tilesY,
      tileSize,
      tileScale,
      texture1Url: tile01Url,
      texture2Url: tile02Url,
      variantChance: 0.1,
    });

    const worldBounds = await groundManager.generate();

    // Create tank sprites
    const tankSprites = await TankFactory.create({
      bodyTextureUrl: tankBody,
      gunTextureUrl: tankGun,
      scale: 0.25,
      initialX: 100,
      initialY: 100,
    });

    this.tankSprite = tankSprites.body;
    this.tankGunSprite = tankSprites.gun;
    this.viewport.addChild(tankSprites.body);
    this.viewport.addChild(tankSprites.gun);

    // Add everything to scene
    this.addChild(this.ui);
    this.addChild(this.viewport);

    // Initialize player movement with world boundaries
    this.playerMovement = new PlayerMovement(
      app,
      this.tankSprite,
      this.tankGunSprite,
      worldBounds
    );

    // Make camera follow the player tank
    this.viewport.follow(this.tankSprite, { speed: 0 });
  }

  update(deltaTime: number): void {
    this.playerMovement?.update(deltaTime);
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
