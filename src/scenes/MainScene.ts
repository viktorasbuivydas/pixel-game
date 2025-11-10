import * as PIXI from "pixi.js";
import { Sprite } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MenuScene } from "./MenuScene";
import { Ui } from "./mainScene/Ui";
import { Minimap } from "./mainScene/Minimap";
import { PlayerMovement } from "../core/PlayerMovement";
import { GroundManager } from "../core/GroundManager";
import { TankFactory } from "../core/TankFactory";
import { ViewportManager } from "../core/ViewportManager";
// @ts-ignore - Vite handles image imports
import tile01Url from "../assets/PNG/PNG/Ground_Tile_01_C.png";
import tile02Url from "../assets/PNG/PNG/Ground_Tile_02_C.png";
import tankBody from "../assets/PNG/Hulls_Color_A/Hull_01.png";
import tankGun from "../assets/PNG/Weapon_Color_A/Gun_01.png";
import { SoundManager } from "@/core/SoundManager";
import tankMovingSound from "../assets/sounds/tank-moving.mp3";
import tankRotatingSound from "../assets/sounds/tank-rotating.mp3";
import { Multiplayer } from "../core/Multiplayer";
import { getStateCallbacks } from "colyseus.js";

export class MainScene extends Scene {
  private viewport!: Viewport;
  private ui!: Ui;
  private level: number = 1;
  private playerMovement: PlayerMovement | undefined;
  private tankSprite: Sprite | undefined;
  private tankGunSprite: Sprite | undefined;
  private multiplayer!: Multiplayer;
  private playerEntities: { [sessionId: string]: any } = {};
  private currentSessionId: string | undefined; // <--- Track our own session ID

  async initialize(): Promise<void> {
    const app = window.app as PIXI.Application;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Initialize multiplayer client
    this.multiplayer = new Multiplayer("http://localhost:2567");

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

    // Set viewport bounds to prevent showing out-of-bounds areas
    this.viewport.clamp({
      left: worldBounds.minX,
      top: worldBounds.minY,
      right: worldBounds.maxX,
      bottom: worldBounds.maxY,
      direction: "all",
    });

    // Add everything to scene
    this.addChild(this.ui);
    this.addChild(this.viewport);

    // Example: Join or create a room, and handle players
    try {
      const room = await this.multiplayer.joinOrCreate("my_room");
      console.log(
        "Connected to room:",
        (room as any).roomId || (room as any).id
      );

      // Store our current session id for correct viewport-follow logic
      this.currentSessionId = room.sessionId;

      const $ = getStateCallbacks(room);
      // Listen for players being added
      $(room.state).players.onAdd(async (player, sessionId) => {
        // Always create a new tank for each player added to the room
        const entity = await TankFactory.create({
          bodyTextureUrl: tankBody,
          gunTextureUrl: tankGun,
          scale: 0.25,
          initialX: 100,
          initialY: 100,
        });

        // Create minimap for *this* client only, when *our own* entity is created
        if (sessionId === this.currentSessionId) {
          const minimap = new Minimap(this.viewport, {
            width: 200,
            height: 200,
            x: screenWidth - 220,
            y: screenHeight - 220,
            worldBounds,
          });
          minimap.setPlayerSprite(entity.body); // only set our own tank on minimap
          this.ui.setMinimap(minimap);
        }

        // Initialize tank position (from server/player if needed)
        entity.body.x = player.x || 100;
        entity.body.y = player.y || 100;
        entity.gun.x = entity.body.x;
        entity.gun.y = entity.body.y;

        // Store entity
        this.playerEntities[sessionId] = entity;

        // If this is *us*, update our references
        if (sessionId === this.currentSessionId) {
          this.tankSprite = entity.body;
          this.tankGunSprite = entity.gun;

          // Add player's tank to the viewport (if not already present)
          if (!this.viewport.children.includes(entity.body)) {
            this.viewport.addChild(entity.body);
          }
          if (!this.viewport.children.includes(entity.gun)) {
            this.viewport.addChild(entity.gun);
          }

          // Init player movement for our own tank
          this.playerMovement = new PlayerMovement(
            app,
            this.tankSprite,
            this.tankGunSprite,
            worldBounds
          );

          SoundManager.load("tank-moving", tankMovingSound, {
            volume: 0.1,
            loop: true,
          });
          SoundManager.load("tank-rotating", tankRotatingSound, {
            volume: 0.05,
            loop: true,
          });

          this.playerMovement.onMoveStateChanged.on((moving) => {
            if (moving) {
              SoundManager.play("tank-moving");
            } else {
              SoundManager.stop("tank-moving");
            }
          });

          this.playerMovement.onRotateStateChanged.on((rotating) => {
            if (rotating) {
              SoundManager.play("tank-rotating");
            } else {
              SoundManager.stop("tank-rotating");
            }
          });

          // Always have camera follow *our* tank (viewport only follows our tank)
          this.viewport.follow(this.tankSprite, { speed: 0 });
        } else {
          // For now, add other players' tanks to viewport but don't control them
          if (!this.viewport.children.includes(entity.body)) {
            this.viewport.addChild(entity.body);
          }
          if (!this.viewport.children.includes(entity.gun)) {
            this.viewport.addChild(entity.gun);
          }
        }
      });

      // Access multiplayer state changes via the multiplayer object instead of using $ directly.
      this.multiplayer.onStateChange((state) => {
        // console.log("state", state);
        state.players.forEach((player) => {
          console.log("state player", player);
          const entity = this.playerEntities[player.sessionId];
          if (entity) {
            entity.body.x = player.x;
            entity.body.y = player.y;
            entity.body.rotation = player.rotation;
            entity.gun.x = entity.body.x;
            entity.gun.y = entity.body.y;
            entity.gun.rotation = player.gunRotation;
            console.log("entity", entity.body.x, entity.body.y);
          }
        });
      });

      // You might want more event handling to update others' positions etc.
    } catch (error) {
      console.error("Failed to connect to multiplayer room:", error);
    }
  }

  update(deltaTime: number): void {
    // Only update our own tank's controls/camera
    this.playerMovement?.update(deltaTime);

    // Always keep the camera on our tank if it exists
    if (this.tankSprite && this.viewport) {
      this.viewport.follow(this.tankSprite, { speed: 0 });
    }
    // Only send input if we're the client, have a tank, and movement controller set up
    if (this.playerMovement && this.currentSessionId) {
      this.multiplayer.sendPlayerInput(
        this.playerMovement.getX(),
        this.playerMovement.getY(),
        this.playerMovement.getTankRotation(),
        this.playerMovement.getGunRotation(),
        this.currentSessionId
      );
    }
    this.ui?.updateMinimap();
  }

  destroy(): void {
    // Leave multiplayer room before destroying scene
    this.multiplayer?.leave();

    this.ui.destroy();
    this.removeChildren();
    this.viewport?.destroy();
  }
}
