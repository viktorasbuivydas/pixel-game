import * as PIXI from "pixi.js";
import { Sprite } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Scene } from "./Scene";
import { Ui } from "./mainScene/Ui";
import { Minimap } from "./mainScene/Minimap";
import { PlayerMovement } from "../core/PlayerMovement";
import { GroundManager } from "../core/GroundManager";
import { GunManager } from "../core/GunManager";
import { TankEntity } from "../core/tanks/TankEntity";
import { TankFactory } from "../core/TankFactory";
import {
  getTankBaseIdFromIndex,
  getGunIdFromIndex,
} from "../core/tanks/TankUniqueIds";
import { TankSelection } from "./TankSelectionScene";
import { ViewportManager } from "../core/ViewportManager";
// @ts-ignore - Vite handles image imports
import tile01Url from "../assets/PNG/PNG/Ground_Tile_01_C.png";
import tile02Url from "../assets/PNG/PNG/Ground_Tile_02_C.png";
import { SoundManager } from "@/core/SoundManager";
import tankMovingSound from "../assets/sounds/tank-moving.mp3";
import tankRotatingSound from "../assets/sounds/tank-rotating.mp3";
import { Multiplayer } from "../core/Multiplayer";
import { getStateCallbacks } from "colyseus.js";
import { CookieUtils } from "../core/CookieUtils";
import { UsernamePrompt } from "../core/UsernamePrompt";
import { PlayersListModal, PlayerInfo } from "./mainScene/PlayersListModal";
import { MenuModal } from "./mainScene/MenuModal";
import { TankHitbox } from "../core/GunManager";
import { SignInScene } from "./SignInScene";
import { SceneManager } from "../core/SceneManager";
import { BotAI } from "../core/BotAI";
import { DebugPanel, DebugSettings } from "./mainScene/DebugPanel";

export class MainScene extends Scene {
  public tankSelection?: TankSelection; // Selection passed from TankSelectionScene
  private viewport!: Viewport;
  private ui!: Ui;
  private level: number = 1;
  private playerMovement: PlayerMovement | undefined;
  private tankSprite: Sprite | undefined;
  private tankGunSprite: Sprite | undefined;
  private multiplayer!: Multiplayer;
  private playerEntities: { [sessionId: string]: any } = {};
  private currentSessionId: string | undefined; // <--- Track our own session ID
  private username: string = "";
  private playersListModal!: PlayersListModal;
  private menuModal!: MenuModal;
  private playerUsernames: { [sessionId: string]: string } = {}; // Track usernames for all players
  private playerKills: { [sessionId: string]: number } = {}; // Track kills for all players
  private gunManager!: GunManager;
  private worldBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null = null;
  private playerHealth: { [sessionId: string]: number } = {}; // Track health for all players
  private isDead: boolean = false;
  private bots: Map<string, { ai: BotAI; entity: any }> = new Map(); // Track bots
  private botCounter: number = 0; // Counter for unique bot IDs
  private debugPanel!: DebugPanel;

  // Interpolation data for other players
  private playerInterpolation: Map<
    string,
    {
      fromX: number;
      fromY: number;
      fromRotation: number;
      fromGunRotation: number;
      toX: number;
      toY: number;
      toRotation: number;
      toGunRotation: number;
      startTime: number;
      duration: number; // Interpolation duration in ms
    }
  > = new Map();

  private debugSettings: DebugSettings = {
    botsEnabled: true,
    movementSpeed: 1.0,
    tankRotationSpeed: 1.0,
    gunRotationSpeed: 1.0,
    gunSpeed: 1.0,
    latency: 0,
  };

  async initialize(): Promise<void> {
    const app = window.app as PIXI.Application;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Get username from cookie (should be set by SignInScene)
    const savedUsername = CookieUtils.get("username");
    if (savedUsername) {
      this.username = savedUsername;
      await this.initializeGame(app, screenWidth, screenHeight);
    } else {
      // Fallback: if no username, show prompt (shouldn't happen normally)
      const usernamePrompt = new UsernamePrompt(
        screenWidth,
        screenHeight,
        "",
        async (username: string) => {
          this.username = username;
          // Save to cookie
          CookieUtils.set("username", username);
          // Initialize game first (this adds UI and viewport)
          await this.initializeGame(app, screenWidth, screenHeight);
          // Small delay to ensure rendering completes
          await new Promise((resolve) => setTimeout(resolve, 100));
          // Remove prompt after game is initialized and rendered
          if (this.children.includes(usernamePrompt)) {
            this.removeChild(usernamePrompt);
          }
          usernamePrompt.destroy();
        }
      );
      this.addChild(usernamePrompt);
    }
  }

  private async initializeGame(
    app: PIXI.Application,
    screenWidth: number,
    screenHeight: number
  ): Promise<void> {
    // Initialize multiplayer client
    let host = import.meta.env.VITE_COLYSEUS_HOST || "http://localhost:2567";
    // If host doesn't start with http:// or https://, add http:// and default port
    if (host && !host.startsWith("http://") && !host.startsWith("https://")) {
      host = `http://${host}:2567`;
    }
    this.multiplayer = new Multiplayer(host);

    // Create UI
    this.ui = new Ui(screenWidth, screenHeight);
    this.ui.setLevel(this.level);

    // Create players list modal
    this.playersListModal = new PlayersListModal(screenWidth, screenHeight);
    this.addChild(this.playersListModal);

    // Create menu modal with callback to send username updates to server
    this.menuModal = new MenuModal(
      screenWidth,
      screenHeight,
      (username: string) => {
        // Update local username
        this.username = username;
        // Send username to server
        if (this.currentSessionId) {
          this.multiplayer.sendUsername(username, this.currentSessionId);
        }
      }
    );
    this.addChild(this.menuModal);

    // Setup Tab key listener for players list
    this.setupPlayersListKeyboard();

    // Setup ESC key listener for menu modal
    this.setupMenuKeyboard();

    // Setup F1 key listener for debug panel
    this.setupDebugKeyboard();

    // Handle "MENU" button - toggle menu modal
    this.ui.onBack(() => {
      this.menuModal.toggle();
    });

    // Create debug panel
    this.debugPanel = new DebugPanel(
      screenWidth,
      screenHeight,
      this.debugSettings,
      (settings) => {
        this.debugSettings = settings;
        this.applyDebugSettings();
      }
    );
    this.addChild(this.debugPanel);

    // Create viewport (will be updated with actual world size after map generation)
    this.viewport = ViewportManager.create(app, {
      screenWidth: 1000,
      screenHeight: 1000,
      worldWidth: 256 * 100,
      worldHeight: 256 * 100,
    });

    // Generate ground tiles
    const tilesX = 64;
    const tilesY = 64;
    const tileSize = 64;
    const tileScale = 1;

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

    // Store world bounds for gun manager
    this.worldBounds = {
      minX: worldBounds.minX,
      minY: worldBounds.minY,
      maxX: worldBounds.maxX,
      maxY: worldBounds.maxY,
    };

    // Initialize gun manager with hit callback
    this.gunManager = new GunManager(
      this.viewport,
      {
        damage: 10,
        fireRate: 2, // 2 shots per second
        bulletSpeed: 8,
        bulletLifetime: 300,
        bulletSize: 4,
      },
      (bullet, targetSessionId) => {
        // Handle bullet hit
        this.handleBulletHit(bullet, targetSessionId);
      }
    );

    // Apply initial debug settings
    this.applyDebugSettings();

    // Set viewport bounds to prevent showing out-of-bounds areas
    this.viewport.clamp({
      left: worldBounds.minX,
      top: worldBounds.minY,
      right: worldBounds.maxX,
      bottom: worldBounds.maxY,
      direction: "all",
    });

    // Add viewport to scene (game world)
    this.addChild(this.viewport);

    // Add UI to app stage directly (separate from game canvas)
    // This ensures UI is always on top and separate from the viewport
    const pixiApp = window.app as PIXI.Application;
    pixiApp.stage.addChild(this.ui);

    // Setup mouse click handler for shooting
    this.setupShooting();

    // Spawn bots after world is created
    await this.spawnBots(screenWidth, screenHeight);

    // Example: Join or create a room, and handle players
    try {
      // Get tank selection from cookie or passed property
      let selection: TankSelection | null = null;
      if (this.tankSelection) {
        selection = this.tankSelection;
      } else {
        const selectionJson = CookieUtils.get("tankSelection");
        if (selectionJson) {
          try {
            selection = JSON.parse(selectionJson);
          } catch (e) {
            console.error("Failed to parse tank selection:", e);
          }
        }
      }

      // Default selection if none found
      if (!selection) {
        selection = { colorIndex: 1, baseIndex: 1, gunIndex: 1 };
      }

      // Join room with username and tank selection in options
      const room = await this.multiplayer.joinOrCreate("my_room", {
        username: this.username,
        colorIndex: selection.colorIndex,
        baseIndex: selection.baseIndex,
        gunIndex: selection.gunIndex,
      });
      console.log(
        "Connected to room:",
        (room as any).roomId || (room as any).id
      );

      // Store our current session id for correct viewport-follow logic
      this.currentSessionId = room.sessionId;

      // Send username to server immediately after joining
      this.multiplayer.sendUsername(this.username, room.sessionId);

      // Send tank selection to server immediately after joining
      this.multiplayer.sendTankSelection(selection, room.sessionId);

      // Setup ping listener
      this.multiplayer.onPingUpdate((latency, _timeOffset) => {
        this.ui.setPing(latency);
      });

      // Listen for shooting events from other players
      room.onMessage("shoot", (message: any) => {
        if (message.sessionId !== this.currentSessionId && this.gunManager) {
          // Create bullet for other player's shot
          // Note: We need to create a bullet object manually since shoot() is for local player
          this.createRemoteBullet(message);
        }
      });

      // Listen for kill events
      room.onMessage("kill", (message: any) => {
        // Update killer's kill count
        this.playerKills[message.killerSessionId] = message.killerKills || 0;

        // Update UI if it's our kill
        if (message.killerSessionId === this.currentSessionId) {
          this.ui.setKills(message.killerKills || 0);
        }

        // Update players list to show new kill count
        this.updatePlayersList();

        console.log(
          `Player ${message.killerSessionId} got a kill! Total: ${message.killerKills}`
        );
      });

      // Listen for health updates
      room.onMessage("health-update", (message: any) => {
        // Store the health from server
        const health = message.health;
        this.playerHealth[message.sessionId] = health;

        // Update health bar for the affected player
        const entity = this.playerEntities[message.sessionId];
        if (
          entity &&
          entity.healthBar &&
          entity.healthBarBackground &&
          entity.body &&
          entity.usernameLabel
        ) {
          const usernameY = entity.body.y - entity.body.height * 0.5 - 15;
          const healthBarWidth = 60;
          const healthBarHeight = 6;
          const healthBarX = entity.body.x - healthBarWidth / 2;
          const healthBarY = usernameY + 12;

          // Update background position
          entity.healthBarBackground.clear();
          entity.healthBarBackground.roundRect(
            healthBarX,
            healthBarY,
            healthBarWidth,
            healthBarHeight,
            2
          );
          entity.healthBarBackground.fill(0x333333);
          entity.healthBarBackground.stroke({ width: 1, color: 0x000000 });

          // Update health bar
          TankFactory.updateHealthBar(
            entity.healthBar,
            healthBarX,
            healthBarY,
            healthBarWidth,
            healthBarHeight,
            health
          );
        }

        // If enemy dies, destroy their tank (player or bot)
        if (
          message.health <= 0 &&
          message.sessionId !== this.currentSessionId
        ) {
          // Check if it's a bot
          if (this.bots.has(message.sessionId)) {
            this.destroyBot(message.sessionId);
          } else {
            this.destroyPlayerTank(message.sessionId);
          }
        }

        // Update UI if it's our health
        if (message.sessionId === this.currentSessionId) {
          this.ui.setHealth(health);

          // Redirect to sign-in scene if health reaches 0
          if (message.health <= 0 && !this.isDead) {
            this.handlePlayerDeath();
          }
        }
      });

      const $ = getStateCallbacks(room);
      // Listen for players being added
      $(room.state).players.onAdd(async (player, sessionId) => {
        // Use username from server state, fallback to generated name
        const playerUsername =
          player.username || `Player ${sessionId.slice(0, 6)}`;

        // Store username for this player
        this.playerUsernames[sessionId] = playerUsername;

        // Store initial health
        this.playerHealth[sessionId] = player.health || 100;

        // Store initial kills
        this.playerKills[sessionId] = player.kills || 0;

        // Update UI if it's our player
        if (sessionId === this.currentSessionId) {
          this.ui.setHealth(player.health || 100);
          this.ui.setKills(player.kills || 0);
        }

        // Create tank - use TankEntity for all players with their selected configuration
        let entity: any;

        // Get tank selection from player state (from backend) or local cookie/passed property
        let selection: TankSelection | null = null;

        if (sessionId === this.currentSessionId) {
          // For current player, get from cookie or passed property
          if (this.tankSelection) {
            selection = this.tankSelection;
          } else {
            const selectionJson = CookieUtils.get("tankSelection");
            if (selectionJson) {
              try {
                selection = JSON.parse(selectionJson);
              } catch (e) {
                console.error("Failed to parse tank selection:", e);
              }
            }
          }
        } else {
          // For other players, get from backend player state
          if (
            (player as any).colorIndex &&
            (player as any).baseIndex &&
            (player as any).gunIndex
          ) {
            selection = {
              colorIndex: (player as any).colorIndex,
              baseIndex: (player as any).baseIndex,
              gunIndex: (player as any).gunIndex,
            };
          }
        }

        // Default selection if none found
        if (!selection) {
          selection = { colorIndex: 1, baseIndex: 1, gunIndex: 1 };
        }

        // Create tank using TankEntity with selected configuration
        const { getTankBaseIdFromIndex, getGunIdFromIndex } = await import(
          "../core/tanks/TankUniqueIds"
        );
        const baseId = getTankBaseIdFromIndex(
          selection.baseIndex,
          selection.colorIndex
        );
        const gunId = getGunIdFromIndex(
          selection.gunIndex,
          selection.colorIndex
        );

        const tankEntity = await TankEntity.create({
          baseId: baseId,
          gunId: gunId,
          initialX: player.x || 100,
          initialY: player.y || 100,
          username: playerUsername,
        });

        // Get gun stats and update GunManager (only for current player)
        if (sessionId === this.currentSessionId) {
          const gunStats = TankEntity.getGunStats(tankEntity);
          this.gunManager.updateConfig({
            damage: gunStats.damage,
            fireRate: gunStats.fireRate,
            bulletSpeed: 8 * gunStats.bulletSpeed, // Base speed * multiplier
            bulletLifetime: Math.floor(
              gunStats.range / (8 * gunStats.bulletSpeed)
            ), // Calculate lifetime from range
          });
        }

        // Convert TankEntity format to match TankFactory format for compatibility
        entity = {
          body: tankEntity.base.base,
          gun: tankEntity.gun.gun,
          container: tankEntity.container,
          usernameLabel: tankEntity.usernameLabel,
          healthBar: tankEntity.healthBar,
          healthBarBackground: tankEntity.healthBarBackground,
        };

        // Store TankEntity for later use
        (entity as any).tankEntity = tankEntity;

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
        // For TankEntity, the container holds everything, so we position the container
        // The base and gun are already positioned correctly inside the container
        if ((entity as any).tankEntity) {
          // TankEntity uses container structure - position the container
          entity.container.x = player.x || 100;
          entity.container.y = player.y || 100;
        } else {
          // Legacy TankFactory - position individual sprites
          entity.body.x = player.x || 100;
          entity.body.y = player.y || 100;
          entity.gun.x = entity.body.x;
          entity.gun.y = entity.body.y;
        }

        // Store entity
        this.playerEntities[sessionId] = entity;

        // If this is *us*, update our references
        if (sessionId === this.currentSessionId) {
          this.tankSprite = entity.body;
          this.tankGunSprite = entity.gun;

          // Add player's tank to the viewport
          // For TankEntity, add the container; for TankFactory, add individual sprites
          if ((entity as any).tankEntity) {
            // TankEntity uses a container structure
            if (!this.viewport.children.includes(entity.container)) {
              this.viewport.addChild(entity.container);
            }
          } else {
            // TankFactory uses individual sprites
            if (!this.viewport.children.includes(entity.body)) {
              this.viewport.addChild(entity.body);
            }
            if (!this.viewport.children.includes(entity.gun)) {
              this.viewport.addChild(entity.gun);
            }
            if (
              entity.usernameLabel &&
              !this.viewport.children.includes(entity.usernameLabel)
            ) {
              this.viewport.addChild(entity.usernameLabel);
            }
            // Add health bars for our own tank
            if (
              entity.healthBarBackground &&
              !this.viewport.children.includes(entity.healthBarBackground)
            ) {
              this.viewport.addChild(entity.healthBarBackground);
            }
            if (
              entity.healthBar &&
              !this.viewport.children.includes(entity.healthBar)
            ) {
              this.viewport.addChild(entity.healthBar);
            }
          }

          // Init player movement for our own tank
          if (this.tankSprite && this.tankGunSprite) {
            // For TankEntity, gun positioning is handled by the container structure
            // No need for gunYOffset since the gun is already positioned correctly
            this.playerMovement = new PlayerMovement(
              app,
              this.tankSprite,
              this.tankGunSprite,
              worldBounds,
              {
                tankRotateSpeed: 0.09,
                turretRotateSpeed: 0.1,
                gunYOffset: 0, // TankEntity handles positioning internally
              }
            );
          }

          SoundManager.load("tank-moving", tankMovingSound, {
            volume: 0.1,
            loop: true,
          });
          SoundManager.load("tank-rotating", tankRotatingSound, {
            volume: 0.05,
            loop: true,
          });

          if (this.playerMovement) {
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
          }

          // Camera following will be handled manually in update() for better control
        } else {
          // Add other players' tanks to viewport
          if (!this.viewport.children.includes(entity.body)) {
            this.viewport.addChild(entity.body);
          }
          if (!this.viewport.children.includes(entity.gun)) {
            this.viewport.addChild(entity.gun);
          }
          if (
            entity.usernameLabel &&
            !this.viewport.children.includes(entity.usernameLabel)
          ) {
            this.viewport.addChild(entity.usernameLabel);
          }
          // Add health bars for other players
          if (
            entity.healthBarBackground &&
            !this.viewport.children.includes(entity.healthBarBackground)
          ) {
            this.viewport.addChild(entity.healthBarBackground);
          }
          if (
            entity.healthBar &&
            !this.viewport.children.includes(entity.healthBar)
          ) {
            this.viewport.addChild(entity.healthBar);
          }
        }

        // Update players list modal
        this.updatePlayersList();
      });

      // Listen for players being removed
      $(room.state).players.onRemove((_player, sessionId) => {
        delete this.playerUsernames[sessionId];
        this.updatePlayersList();
      });

      // Listen for username changes
      $(room.state).players.onChange((player, sessionId) => {
        // Update username if it changed
        if (
          player.username &&
          this.playerUsernames[sessionId] !== player.username
        ) {
          this.playerUsernames[sessionId] = player.username;
          // Update username label if entity exists
          const entity = this.playerEntities[sessionId];
          if (entity && entity.usernameLabel) {
            entity.usernameLabel.text = player.username;
          }
          // Update players list
          this.updatePlayersList();
        }
      });

      // Access multiplayer state changes via the multiplayer object instead of using $ directly.
      this.multiplayer.onStateChange((state) => {
        // console.log("state", state);
        state.players?.forEach((player) => {
          console.log("state player", player);
          const entity = this.playerEntities[player.sessionId];
          if (entity) {
            const isCurrentPlayer = player.sessionId === this.currentSessionId;

            if (isCurrentPlayer) {
              // CLIENT-SIDE PREDICTION: For current player, reconcile with server
              // Check if prediction is too far off (reconciliation threshold)
              if (this.tankSprite && this.tankGunSprite) {
                const currentX = (entity as any).tankEntity
                  ? entity.container.x
                  : this.tankSprite.x;
                const currentY = (entity as any).tankEntity
                  ? entity.container.y
                  : this.tankSprite.y;
                const predictionError = Math.hypot(
                  currentX - player.x,
                  currentY - player.y
                );

                // If error is too large (> 50 pixels), snap to server position
                // Otherwise, smoothly correct (lerp towards server position)
                const reconciliationThreshold = 50;
                if (predictionError > reconciliationThreshold) {
                  // Snap to server position if too far off
                  const ourEntity = this.playerEntities[this.currentSessionId!];
                  if (ourEntity && (ourEntity as any).tankEntity) {
                    // TankEntity uses container structure
                    ourEntity.container.x = player.x;
                    ourEntity.container.y = player.y;
                  } else {
                    // Legacy TankFactory
                    this.tankSprite.x = player.x;
                    this.tankSprite.y = player.y;
                    this.tankGunSprite.x = player.x;
                    this.tankGunSprite.y = player.y;
                  }
                  if (this.playerMovement) {
                    (this.playerMovement as any).tankAngle = player.rotation;
                    // Don't override gun rotation for current player - let PlayerMovement handle it from mouse
                    // (this.playerMovement as any).tankGunSprite.rotation = player.gunRotation;
                  }
                } else if (predictionError > 5) {
                  // Smooth correction for small errors
                  const correctionFactor = 0.2; // 20% correction per frame
                  const ourEntity = this.playerEntities[this.currentSessionId!];
                  if (ourEntity && (ourEntity as any).tankEntity) {
                    // TankEntity uses container structure
                    ourEntity.container.x +=
                      (player.x - ourEntity.container.x) * correctionFactor;
                    ourEntity.container.y +=
                      (player.y - ourEntity.container.y) * correctionFactor;
                  } else {
                    // Legacy TankFactory
                    this.tankSprite.x +=
                      (player.x - this.tankSprite.x) * correctionFactor;
                    this.tankSprite.y +=
                      (player.y - this.tankSprite.y) * correctionFactor;
                    this.tankGunSprite.x = this.tankSprite.x;
                    this.tankGunSprite.y = this.tankSprite.y;
                  }
                }
                // For very small errors (< 5px), don't correct to avoid jitter
              }
            } else {
              // INTERPOLATION: For other players, use linear interpolation
              const interpolationData = this.playerInterpolation.get(
                player.sessionId
              );
              const now = performance.now();

              // Check if we need to start a new interpolation
              if (
                !interpolationData ||
                interpolationData.toX !== player.x ||
                interpolationData.toY !== player.y ||
                interpolationData.toRotation !== player.rotation ||
                interpolationData.toGunRotation !== player.gunRotation
              ) {
                // Start new interpolation
                const currentX = entity.body.x || player.x;
                const currentY = entity.body.y || player.y;
                const currentRotation = entity.body.rotation || player.rotation;
                const currentGunRotation =
                  entity.gun.rotation || player.gunRotation;

                this.playerInterpolation.set(player.sessionId, {
                  fromX: currentX,
                  fromY: currentY,
                  fromRotation: currentRotation,
                  fromGunRotation: currentGunRotation,
                  toX: player.x,
                  toY: player.y,
                  toRotation: player.rotation,
                  toGunRotation: player.gunRotation,
                  startTime: now,
                  duration: 100, // Interpolate over 100ms (adjust based on server update rate)
                });
              }

              // The actual interpolation happens in the update loop for smooth frame-by-frame updates
            }

            // Update username label position and text if username changed
            // For current player, use predicted position; for others, interpolation handles it in update loop
            if (entity.usernameLabel && isCurrentPlayer) {
              const usernameY =
                (isCurrentPlayer ? this.tankSprite?.y : entity.body.y) -
                entity.body.height * 0.5 -
                15;
              entity.usernameLabel.x = isCurrentPlayer
                ? this.tankSprite?.x || player.x
                : entity.body.x;
              entity.usernameLabel.y = usernameY;
              // Update username text if it changed on server
              if (
                player.username &&
                entity.usernameLabel.text !== player.username
              ) {
                entity.usernameLabel.text = player.username;
                this.playerUsernames[player.sessionId] = player.username;
              }

              // Update kills if changed
              if (
                player.kills !== undefined &&
                this.playerKills[player.sessionId] !== player.kills
              ) {
                this.playerKills[player.sessionId] = player.kills;
                // Update UI if it's our player
                if (player.sessionId === this.currentSessionId) {
                  this.ui.setKills(player.kills);
                }
                // Update players list if kills changed
                this.updatePlayersList();
              }

              // Update health bar position and value
              if (entity.healthBar && entity.healthBarBackground) {
                const healthBarWidth = 60;
                const healthBarHeight = 6;
                // Use predicted position for current player, server position for others
                const currentX = isCurrentPlayer
                  ? this.tankSprite?.x || player.x
                  : player.x;
                const healthBarX = currentX - healthBarWidth / 2;
                const healthBarY = usernameY + 12;

                // Update background position
                entity.healthBarBackground.clear();
                entity.healthBarBackground.roundRect(
                  healthBarX,
                  healthBarY,
                  healthBarWidth,
                  healthBarHeight,
                  2
                );
                entity.healthBarBackground.fill(0x333333);
                entity.healthBarBackground.stroke({
                  width: 1,
                  color: 0x000000,
                });

                // Update health bar with current health from server
                const health =
                  player.health || this.playerHealth[player.sessionId] || 100;
                TankFactory.updateHealthBar(
                  entity.healthBar,
                  healthBarX,
                  healthBarY,
                  healthBarWidth,
                  healthBarHeight,
                  health
                );
              }
            }
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
    // Don't update if dead
    if (this.isDead) {
      return;
    }

    // CLIENT-SIDE PREDICTION: Update current player position immediately
    // This makes the game feel responsive without waiting for server confirmation
    if (this.playerMovement && this.currentSessionId) {
      this.playerMovement.update(deltaTime);

      // For TankEntity, gun position is handled by container structure
      // PlayerMovement updates the tank sprite, and the gun follows via container
      // No manual gun positioning needed
    }

    // Continue interpolating other players (handled in onStateChange, but ensure smooth updates)
    // The interpolation happens in onStateChange, but we can also update it here for smoother results
    for (const [sessionId, interp] of this.playerInterpolation.entries()) {
      if (sessionId === this.currentSessionId) continue; // Skip current player

      const entity = this.playerEntities[sessionId];
      if (!entity) continue;

      const now = performance.now();
      const elapsed = now - interp.startTime;
      const t = Math.min(1, elapsed / interp.duration);

      // Update interpolated positions
      if ((entity as any).tankEntity) {
        // TankEntity uses container structure - position the container
        entity.container.x = interp.fromX + (interp.toX - interp.fromX) * t;
        entity.container.y = interp.fromY + (interp.toY - interp.fromY) * t;
      } else {
        // Legacy TankFactory - position individual sprites
        entity.body.x = interp.fromX + (interp.toX - interp.fromX) * t;
        entity.body.y = interp.fromY + (interp.toY - interp.fromY) * t;
        entity.gun.x = entity.body.x;
        entity.gun.y = entity.body.y;
      }

      // Angular interpolation
      const rotDiff =
        ((interp.toRotation - interp.fromRotation + Math.PI) % (2 * Math.PI)) -
        Math.PI;
      entity.body.rotation = interp.fromRotation + rotDiff * t;

      const gunRotDiff =
        ((interp.toGunRotation - interp.fromGunRotation + Math.PI) %
          (2 * Math.PI)) -
        Math.PI;
      entity.gun.rotation = interp.fromGunRotation + gunRotDiff * t;

      // Update username label and health bar positions
      if (entity.usernameLabel) {
        const usernameY = entity.body.y - entity.body.height * 0.5 - 15;
        entity.usernameLabel.x = entity.body.x;
        entity.usernameLabel.y = usernameY;
      }
    }

    // Collect tank hitboxes for collision detection (only alive players and bots)
    const tankHitboxes: TankHitbox[] = [];

    // Add player hitboxes
    for (const [sessionId, entity] of Object.entries(this.playerEntities)) {
      if (entity && entity.body) {
        // Only include alive players (health > 0)
        const health = this.playerHealth[sessionId] || 100;
        if (health > 0) {
          tankHitboxes.push({
            x: entity.body.x,
            y: entity.body.y,
            width: entity.body.width * entity.body.scale.x,
            height: entity.body.height * entity.body.scale.y,
            sessionId: sessionId,
          });
        }
      }
    }

    // Add bot hitboxes
    for (const [botId, botData] of this.bots.entries()) {
      if (botData.entity && botData.entity.body) {
        const health = this.playerHealth[botId] || 100;
        if (health > 0) {
          tankHitboxes.push({
            x: botData.entity.body.x,
            y: botData.entity.body.y,
            width: botData.entity.body.width * botData.entity.body.scale.x,
            height: botData.entity.body.height * botData.entity.body.scale.y,
            sessionId: botId,
          });
        }
      }
    }

    // Update gun manager (bullet movement, lifetime, collision, etc.)
    if (this.gunManager && this.worldBounds) {
      this.gunManager.update(deltaTime, this.worldBounds, tankHitboxes);
    }

    // Sync username label and health bar position with tank position
    const ourEntity = this.currentSessionId
      ? this.playerEntities[this.currentSessionId]
      : null;
    if (ourEntity && ourEntity.usernameLabel && this.tankSprite) {
      // Update username label position to stay above tank
      const usernameY = this.tankSprite.y - this.tankSprite.height * 0.5 - 15;
      ourEntity.usernameLabel.x = this.tankSprite.x;
      ourEntity.usernameLabel.y = usernameY;

      // Update health bar position
      if (ourEntity.healthBar && ourEntity.healthBarBackground) {
        const healthBarWidth = 60;
        const healthBarHeight = 6;
        const healthBarX = this.tankSprite.x - healthBarWidth / 2;
        const healthBarY = usernameY + 12;

        // Update background position
        ourEntity.healthBarBackground.clear();
        ourEntity.healthBarBackground.roundRect(
          healthBarX,
          healthBarY,
          healthBarWidth,
          healthBarHeight,
          2
        );
        ourEntity.healthBarBackground.fill(0x333333);
        ourEntity.healthBarBackground.stroke({ width: 1, color: 0x000000 });

        // Update health bar with current health
        const health = this.currentSessionId
          ? this.playerHealth[this.currentSessionId] || 100
          : 100;
        TankFactory.updateHealthBar(
          ourEntity.healthBar,
          healthBarX,
          healthBarY,
          healthBarWidth,
          healthBarHeight,
          health
        );
      }
    }

    // Update health bars for all players (only if they exist and are alive)
    for (const [sessionId, entity] of Object.entries(this.playerEntities)) {
      if (
        entity &&
        entity.body &&
        entity.usernameLabel &&
        entity.healthBar &&
        entity.healthBarBackground
      ) {
        // Skip if player is dead (health <= 0)
        const health = this.playerHealth[sessionId] || 100;
        if (health <= 0) {
          continue;
        }

        const usernameY = entity.body.y - entity.body.height * 0.5 - 15;
        const healthBarWidth = 60;
        const healthBarHeight = 6;
        const healthBarX = entity.body.x - healthBarWidth / 2;
        const healthBarY = usernameY + 12;

        // Update background position
        entity.healthBarBackground.clear();
        entity.healthBarBackground.roundRect(
          healthBarX,
          healthBarY,
          healthBarWidth,
          healthBarHeight,
          2
        );
        entity.healthBarBackground.fill(0x333333);
        entity.healthBarBackground.stroke({ width: 1, color: 0x000000 });

        // Update health bar with current health
        TankFactory.updateHealthBar(
          entity.healthBar,
          healthBarX,
          healthBarY,
          healthBarWidth,
          healthBarHeight,
          health
        );
      }
    }

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
        this.playerMovement.getCurrentSpeed(),
        this.playerMovement.getCurrentRotationSpeed(),
        this.playerMovement.getCurrentGunRotationSpeed(),
        this.currentSessionId
      );
    }
    this.ui?.updateMinimap();

    // Update bots
    if (this.worldBounds) {
      // Collect all player positions for bot AI
      const playerPositions: Array<{
        x: number;
        y: number;
        sessionId: string;
      }> = [];

      // Add real players
      for (const [sessionId, entity] of Object.entries(this.playerEntities)) {
        if (entity && entity.body) {
          const health = this.playerHealth[sessionId] || 100;
          if (health > 0) {
            playerPositions.push({
              x: entity.body.x,
              y: entity.body.y,
              sessionId: sessionId,
            });
          }
        }
      }

      // Collect bot positions (for bots to target other bots)
      const botPositions: Array<{
        x: number;
        y: number;
        sessionId: string;
        botId: string;
      }> = [];

      for (const [botId, botData] of this.bots.entries()) {
        const health = this.playerHealth[botId] || 100;
        if (health > 0) {
          const pos = botData.ai.getPosition();
          botPositions.push({
            x: pos.x,
            y: pos.y,
            sessionId: botId,
            botId: botId,
          });
        }
      }

      // Update each bot
      for (const [botId, botData] of this.bots.entries()) {
        const health = this.playerHealth[botId] || 100;
        if (health > 0) {
          // Hide/show bots based on debug settings
          const shouldBeVisible = this.debugSettings.botsEnabled;
          botData.entity.body.visible = shouldBeVisible;
          botData.entity.gun.visible = shouldBeVisible;
          if (botData.entity.usernameLabel) {
            botData.entity.usernameLabel.visible = shouldBeVisible;
          }
          if (botData.entity.healthBar) {
            botData.entity.healthBar.visible = shouldBeVisible;
          }
          if (botData.entity.healthBarBackground) {
            botData.entity.healthBarBackground.visible = shouldBeVisible;
          }

          // Only update bots if they're enabled
          let pos: { x: number; y: number } | null = null;
          if (this.debugSettings.botsEnabled) {
            botData.ai.update(deltaTime, playerPositions, botPositions);

            // Update bot entity positions
            pos = botData.ai.getPosition();
            if ((botData.entity as any).tankEntity) {
              // TankEntity uses container structure - position the container
              botData.entity.container.x = pos.x;
              botData.entity.container.y = pos.y;
              botData.entity.body.rotation = botData.ai.getRotation();
              botData.entity.gun.rotation = botData.ai.getGunRotation();
            } else {
              // Legacy TankFactory - position individual sprites
              botData.entity.body.x = pos.x;
              botData.entity.body.y = pos.y;
              botData.entity.body.rotation = botData.ai.getRotation();
              botData.entity.gun.x = pos.x;
              botData.entity.gun.y = pos.y;
              botData.entity.gun.rotation = botData.ai.getGunRotation();
            }
          } else {
            // Get position without updating AI (for UI positioning)
            pos = botData.ai.getPosition();
          }

          // Update bot username label and health bar position
          if (botData.entity.usernameLabel && pos) {
            const usernameY = pos.y - botData.entity.body.height * 0.5 - 15;
            botData.entity.usernameLabel.x = pos.x;
            botData.entity.usernameLabel.y = usernameY;

            // Update health bar
            if (
              botData.entity.healthBar &&
              botData.entity.healthBarBackground
            ) {
              const healthBarWidth = 60;
              const healthBarHeight = 6;
              const healthBarX = pos.x - healthBarWidth / 2;
              const healthBarY = usernameY + 12;

              botData.entity.healthBarBackground.clear();
              botData.entity.healthBarBackground.roundRect(
                healthBarX,
                healthBarY,
                healthBarWidth,
                healthBarHeight,
                2
              );
              botData.entity.healthBarBackground.fill(0x333333);
              botData.entity.healthBarBackground.stroke({
                width: 1,
                color: 0x000000,
              });

              TankFactory.updateHealthBar(
                botData.entity.healthBar,
                healthBarX,
                healthBarY,
                healthBarWidth,
                healthBarHeight,
                health
              );
            }
          }
        }
      }
    }

    // Update FPS
    const app = window.app as PIXI.Application;
    if (app && app.ticker) {
      this.ui.setFps(app.ticker.FPS);
    }
  }

  private shootHandler = (e: MouseEvent) => {
    // Only shoot on left mouse button
    if (
      e.button === 0 &&
      this.tankGunSprite &&
      this.currentSessionId &&
      !this.isDead
    ) {
      this.handleShoot();
    }
  };

  /**
   * Setup mouse click handler for shooting
   */
  private setupShooting(): void {
    const app = window.app as PIXI.Application;
    app.view.addEventListener("mousedown", this.shootHandler);
  }

  /**
   * Handle shooting
   */
  private handleShoot(): void {
    if (
      !this.tankGunSprite ||
      !this.currentSessionId ||
      !this.gunManager ||
      this.isDead
    ) {
      return;
    }

    // Get the world position of the gun sprite
    // For TankEntity, the gun sprite is inside a container, so we need to get its world position
    const ourEntity = this.playerEntities[this.currentSessionId];
    let gunWorldX: number;
    let gunWorldY: number;
    let gunRotation: number;

    if (ourEntity && (ourEntity as any).tankEntity) {
      // TankEntity uses container structure - get world position
      const gunSprite = ourEntity.gun;
      // Get the world transform of the gun sprite
      const worldTransform = gunSprite.worldTransform;
      // The gun sprite's anchor point (rotation point) is at its local (0, 0) after anchor is set
      // Get the world position of the anchor point
      gunWorldX = worldTransform.tx;
      gunWorldY = worldTransform.ty;
      // Get the world rotation (container rotation + gun rotation)
      gunRotation = gunSprite.rotation;
    } else {
      // Legacy TankFactory - use sprite position directly
      gunWorldX = this.tankGunSprite.x;
      gunWorldY = this.tankGunSprite.y;
      gunRotation = this.tankGunSprite.rotation;
    }

    // Shoot bullet from gun position and rotation
    const bullet = this.gunManager.shoot(
      gunWorldX,
      gunWorldY,
      gunRotation,
      this.currentSessionId
    );

    if (bullet) {
      // Play fire animation if using TankEntity
      const ourEntity = this.currentSessionId
        ? this.playerEntities[this.currentSessionId]
        : null;
      if (ourEntity && (ourEntity as any).tankEntity) {
        TankEntity.playFireAnimation((ourEntity as any).tankEntity);
      }

      // Send shooting event to server
      this.multiplayer.send("shoot", {
        x: bullet.x,
        y: bullet.y,
        vx: bullet.vx,
        vy: bullet.vy,
        rotation: bullet.rotation,
        sessionId: this.currentSessionId,
      });
    }
  }

  /**
   * Create a bullet for remote player's shot
   */
  private createRemoteBullet(message: any): void {
    if (!this.gunManager) return;

    // Use GunManager's method to add remote bullet
    this.gunManager.addRemoteBullet(
      message.x,
      message.y,
      message.vx,
      message.vy,
      message.rotation,
      message.sessionId
    );
  }

  /**
   * Handle bullet hit on a tank
   */
  private handleBulletHit(bullet: any, targetSessionId: string): void {
    if (!this.currentSessionId) {
      return;
    }

    // Check if shooter is a bot
    const isBotShooter =
      bullet.ownerSessionId && this.bots.has(bullet.ownerSessionId);

    // Check if target is a bot (client-side damage for bots)
    if (this.bots.has(targetSessionId)) {
      // Apply damage directly to bot (client-side)
      const currentHealth = this.playerHealth[targetSessionId] || 100;
      const newHealth = Math.max(0, currentHealth - bullet.damage);
      this.playerHealth[targetSessionId] = newHealth;

      // Update health bar
      const botData = this.bots.get(targetSessionId);
      if (
        botData &&
        botData.entity &&
        botData.entity.healthBar &&
        botData.entity.healthBarBackground
      ) {
        const pos = botData.ai.getPosition();
        const usernameY = pos.y - botData.entity.body.height * 0.5 - 15;
        const healthBarWidth = 60;
        const healthBarHeight = 6;
        const healthBarX = pos.x - healthBarWidth / 2;
        const healthBarY = usernameY + 12;

        botData.entity.healthBarBackground.clear();
        botData.entity.healthBarBackground.roundRect(
          healthBarX,
          healthBarY,
          healthBarWidth,
          healthBarHeight,
          2
        );
        botData.entity.healthBarBackground.fill(0x333333);
        botData.entity.healthBarBackground.stroke({
          width: 1,
          color: 0x000000,
        });

        TankFactory.updateHealthBar(
          botData.entity.healthBar,
          healthBarX,
          healthBarY,
          healthBarWidth,
          healthBarHeight,
          newHealth
        );
      }

      // Destroy bot if health reaches 0
      if (newHealth <= 0) {
        this.destroyBot(targetSessionId);
        // Award kill to shooter if it's a player
        if (
          bullet.ownerSessionId &&
          this.playerKills[bullet.ownerSessionId] !== undefined
        ) {
          this.playerKills[bullet.ownerSessionId] =
            (this.playerKills[bullet.ownerSessionId] || 0) + 1;
          // Update UI if it's our kill
          if (bullet.ownerSessionId === this.currentSessionId) {
            this.ui.setKills(this.playerKills[bullet.ownerSessionId]);
          }
          this.updatePlayersList();
        }
      }
    } else {
      // Target is a real player
      if (isBotShooter) {
        // Bot is shooting at player - apply damage directly (client-side for bot damage)
        // Since bots are client-side only, we handle their damage client-side
        const currentHealth = this.playerHealth[targetSessionId] || 100;
        const newHealth = Math.max(0, currentHealth - bullet.damage);
        this.playerHealth[targetSessionId] = newHealth;

        // Update health bar if it's our player
        if (targetSessionId === this.currentSessionId) {
          this.ui.setHealth(newHealth);

          // Check if player died
          if (newHealth <= 0 && !this.isDead) {
            this.handlePlayerDeath();
          }
        } else {
          // Update other player's health bar
          const entity = this.playerEntities[targetSessionId];
          if (
            entity &&
            entity.healthBar &&
            entity.healthBarBackground &&
            entity.body &&
            entity.usernameLabel
          ) {
            const usernameY = entity.body.y - entity.body.height * 0.5 - 15;
            const healthBarWidth = 60;
            const healthBarHeight = 6;
            const healthBarX = entity.body.x - healthBarWidth / 2;
            const healthBarY = usernameY + 12;

            entity.healthBarBackground.clear();
            entity.healthBarBackground.roundRect(
              healthBarX,
              healthBarY,
              healthBarWidth,
              healthBarHeight,
              2
            );
            entity.healthBarBackground.fill(0x333333);
            entity.healthBarBackground.stroke({ width: 1, color: 0x000000 });

            TankFactory.updateHealthBar(
              entity.healthBar,
              healthBarX,
              healthBarY,
              healthBarWidth,
              healthBarHeight,
              newHealth
            );
          }
        }
      } else if (this.multiplayer) {
        // Player is shooting at player - send to server
        this.multiplayer.send("damage", {
          targetSessionId: targetSessionId,
          damage: bullet.damage,
        });
      }
    }
  }

  /**
   * Destroy a bot
   */
  private destroyBot(botId: string): void {
    const botData = this.bots.get(botId);
    if (!botData) {
      return;
    }

    const entity = botData.entity;

    // Remove all sprites from viewport
    if (entity.body && this.viewport.children.includes(entity.body)) {
      this.viewport.removeChild(entity.body);
      entity.body.destroy();
    }
    if (entity.gun && this.viewport.children.includes(entity.gun)) {
      this.viewport.removeChild(entity.gun);
      entity.gun.destroy();
    }
    if (
      entity.usernameLabel &&
      this.viewport.children.includes(entity.usernameLabel)
    ) {
      this.viewport.removeChild(entity.usernameLabel);
      entity.usernameLabel.destroy();
    }
    if (entity.healthBar && this.viewport.children.includes(entity.healthBar)) {
      this.viewport.removeChild(entity.healthBar);
      entity.healthBar.destroy();
    }
    if (
      entity.healthBarBackground &&
      this.viewport.children.includes(entity.healthBarBackground)
    ) {
      this.viewport.removeChild(entity.healthBarBackground);
      entity.healthBarBackground.destroy();
    }

    // Remove from bots map
    this.bots.delete(botId);
    delete this.playerHealth[botId];
    delete this.playerUsernames[botId];
    delete this.playerKills[botId];

    // Update players list
    this.updatePlayersList();
  }

  /**
   * Destroy a player's tank (for enemies)
   */
  private destroyPlayerTank(sessionId: string): void {
    const entity = this.playerEntities[sessionId];
    if (!entity) {
      return;
    }

    // Remove all sprites from viewport
    if (entity.body && this.viewport.children.includes(entity.body)) {
      this.viewport.removeChild(entity.body);
      entity.body.destroy();
    }
    if (entity.gun && this.viewport.children.includes(entity.gun)) {
      this.viewport.removeChild(entity.gun);
      entity.gun.destroy();
    }
    if (
      entity.usernameLabel &&
      this.viewport.children.includes(entity.usernameLabel)
    ) {
      this.viewport.removeChild(entity.usernameLabel);
      entity.usernameLabel.destroy();
    }
    if (entity.healthBar && this.viewport.children.includes(entity.healthBar)) {
      this.viewport.removeChild(entity.healthBar);
      entity.healthBar.destroy();
    }
    if (
      entity.healthBarBackground &&
      this.viewport.children.includes(entity.healthBarBackground)
    ) {
      this.viewport.removeChild(entity.healthBarBackground);
      entity.healthBarBackground.destroy();
    }

    // Remove from entities map
    delete this.playerEntities[sessionId];
    delete this.playerHealth[sessionId];
    delete this.playerUsernames[sessionId];
    delete this.playerKills[sessionId];

    // Update players list
    this.updatePlayersList();
  }

  /**
   * Spawn 10 bots randomly across the map
   */
  private async spawnBots(
    _screenWidth: number,
    _screenHeight: number
  ): Promise<void> {
    if (!this.worldBounds) {
      return;
    }

    const numBots = 10;
    const margin = 100; // Margin from edges

    for (let i = 0; i < numBots; i++) {
      // Generate random position within world bounds
      const randomX =
        this.worldBounds.minX +
        margin +
        Math.random() *
          (this.worldBounds.maxX - this.worldBounds.minX - 2 * margin);
      const randomY =
        this.worldBounds.minY +
        margin +
        Math.random() *
          (this.worldBounds.maxY - this.worldBounds.minY - 2 * margin);

      // Create bot entity using TankEntity (same as players)
      const botId = `bot_${this.botCounter++}`;
      const botUsername = `Bot ${i + 1}`;

      // Use random tank configuration for bots
      const botColorIndex = Math.floor(Math.random() * 4) + 1;
      const botBaseIndex = Math.floor(Math.random() * 4) + 1;
      const botGunIndex = Math.floor(Math.random() * 4) + 1;

      const baseId = getTankBaseIdFromIndex(botBaseIndex, botColorIndex);
      const gunId = getGunIdFromIndex(botGunIndex, botColorIndex);

      const tankEntity = await TankEntity.create({
        baseId: baseId,
        gunId: gunId,
        initialX: randomX,
        initialY: randomY,
        username: botUsername,
      });

      // Convert TankEntity format to match entity format for compatibility
      const entity = {
        body: tankEntity.base.base,
        gun: tankEntity.gun.gun,
        container: tankEntity.container,
        usernameLabel: tankEntity.usernameLabel,
        healthBar: tankEntity.healthBar,
        healthBarBackground: tankEntity.healthBarBackground,
      };

      // Store TankEntity for later use
      (entity as any).tankEntity = tankEntity;

      // Store bot ID on sprite for self-identification
      (entity.body as any).botId = botId;
      (entity.gun as any).botId = botId;

      // Add to viewport - TankEntity uses container structure
      if (!this.viewport.children.includes(entity.container)) {
        this.viewport.addChild(entity.container);
      }

      // Create bot AI
      const botAI = new BotAI({
        tankBody: entity.body,
        tankGun: entity.gun,
        worldBounds: {
          minX: this.worldBounds.minX,
          minY: this.worldBounds.minY,
          maxX: this.worldBounds.maxX,
          maxY: this.worldBounds.maxY,
        },
        moveSpeed: 1.5,
        rotationSpeed: 0.04,
        shootRange: 600, // Increased shooting radius
        shootCooldown: 1500, // 1.5 seconds
      });

      // Set bot ID for self-identification
      botAI.setBotId(botId);

      // Set up bot shooting
      botAI.setOnShoot((x, y, rotation) => {
        if (this.gunManager) {
          // Calculate bullet direction
          const bulletAngle = rotation - Math.PI / 2;
          const bulletSpeed = 8;
          const vx = Math.cos(bulletAngle) * bulletSpeed;
          const vy = Math.sin(bulletAngle) * bulletSpeed;

          // Create bullet for bot
          this.gunManager.addRemoteBullet(x, y, vx, vy, rotation, botId);
        }
      });

      // Store bot
      this.bots.set(botId, { ai: botAI, entity: entity });

      // Initialize bot health
      this.playerHealth[botId] = 100;
      this.playerUsernames[botId] = botUsername;
      this.playerKills[botId] = 0;
    }
  }

  /**
   * Handle player death - disable controls, stop sounds, redirect to sign-in
   */
  private handlePlayerDeath(): void {
    if (this.isDead) {
      return; // Already handled
    }

    this.isDead = true;

    // Stop all sound effects
    SoundManager.stop("tank-moving");
    SoundManager.stop("tank-rotating");
    SoundManager.stopAll();

    // Remove shooting event listener
    const app = window.app as PIXI.Application;
    if (app && app.view) {
      app.view.removeEventListener("mousedown", this.shootHandler);
    }

    // Disable player movement (update loop already checks isDead, but stop sounds)
    if (this.playerMovement) {
      // Stop any movement sounds
      SoundManager.stop("tank-moving");
      SoundManager.stop("tank-rotating");
    }

    // Leave multiplayer room
    this.multiplayer?.leave();

    // Redirect to sign-in scene
    const signInScene = new SignInScene();
    signInScene.initialize();
    SceneManager.changeScene(signInScene);
  }

  private tabKeyHandler = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault(); // Prevent default tab behavior
      this.playersListModal.toggle();
    }
  };

  private escKeyHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      this.menuModal.hide();
    }
  };

  /**
   * Setup keyboard listener for Tab key to show/hide players list
   */
  private setupPlayersListKeyboard(): void {
    window.addEventListener("keydown", this.tabKeyHandler);
  }

  /**
   * Setup keyboard listener for ESC key to close menu modal
   */
  private setupMenuKeyboard(): void {
    window.addEventListener("keydown", this.escKeyHandler);
  }

  private f1KeyHandler = (e: KeyboardEvent) => {
    if (e.key === "Shift") {
      e.preventDefault(); // Prevent default Shift behavior, if any
      this.debugPanel.toggle();
    }
  };

  /**
   * Setup keyboard listener for F1 key to toggle debug panel
   */
  private setupDebugKeyboard(): void {
    window.addEventListener("keydown", this.f1KeyHandler);
  }

  /**
   * Apply debug settings to game systems
   */
  private applyDebugSettings(): void {
    // Apply movement speed multiplier
    if (this.playerMovement) {
      this.playerMovement.setMovementSpeedMultiplier(
        this.debugSettings.movementSpeed
      );
      this.playerMovement.setTankRotationSpeedMultiplier(
        this.debugSettings.tankRotationSpeed
      );
      this.playerMovement.setGunRotationSpeedMultiplier(
        this.debugSettings.gunRotationSpeed
      );
    }

    // Apply gun speed multiplier
    if (this.gunManager) {
      this.gunManager.setBulletSpeedMultiplier(this.debugSettings.gunSpeed);
    }

    // Send latency update to server
    if (this.multiplayer) {
      const room = this.multiplayer.getRoom();
      if (room) {
        room.send("set-latency", {
          latency: this.debugSettings.latency,
        });
      }
    }
  }

  /**
   * Update the players list modal with current players (including bots)
   */
  private updatePlayersList(): void {
    const players: PlayerInfo[] = Object.keys(this.playerUsernames).map(
      (sessionId) => ({
        sessionId,
        username: this.playerUsernames[sessionId],
        isCurrentPlayer: sessionId === this.currentSessionId,
        kills: this.playerKills[sessionId] || 0,
      })
    );

    // Sort: current player first, then others
    players.sort((a, b) => {
      if (a.isCurrentPlayer) return -1;
      if (b.isCurrentPlayer) return 1;
      return a.username.localeCompare(b.username);
    });

    this.playersListModal.updatePlayers(players);
  }

  destroy(): void {
    // Leave multiplayer room before destroying scene
    this.multiplayer?.leave();

    // Remove keyboard listeners
    window.removeEventListener("keydown", this.tabKeyHandler);
    window.removeEventListener("keydown", this.escKeyHandler);

    // Remove shooting event listener
    const app = window.app as PIXI.Application;
    if (app && app.view) {
      app.view.removeEventListener("mousedown", this.shootHandler);
    }

    // Stop all sounds
    SoundManager.stopAll();

    // Clean up gun manager
    this.gunManager?.destroy();

    // Remove UI from app stage (it was added separately)
    const pixiApp = window.app as PIXI.Application;
    if (this.ui && pixiApp.stage.children.includes(this.ui)) {
      pixiApp.stage.removeChild(this.ui);
    }
    this.ui?.destroy();
    this.removeChildren();
    this.viewport?.destroy();
  }
}
