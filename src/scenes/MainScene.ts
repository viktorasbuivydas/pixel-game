import * as PIXI from "pixi.js";
import { Sprite } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Scene } from "./Scene";
import { Ui } from "./mainScene/Ui";
import { Minimap } from "./mainScene/Minimap";
import { PlayerMovement } from "../core/PlayerMovement";
import { GroundManager } from "../core/GroundManager";
import { GunManager } from "../core/GunManager";
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
import { CookieUtils } from "../core/CookieUtils";
import { UsernamePrompt } from "../core/UsernamePrompt";
import { PlayersListModal, PlayerInfo } from "./mainScene/PlayersListModal";
import { MenuModal } from "./mainScene/MenuModal";
import { TankHitbox } from "../core/GunManager";
import { SignInScene } from "./SignInScene";
import { SceneManager } from "../core/SceneManager";

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

    // Handle "MENU" button - toggle menu modal
    this.ui.onBack(() => {
      this.menuModal.toggle();
    });

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

    // Setup mouse click handler for shooting
    this.setupShooting();

    // Example: Join or create a room, and handle players
    try {
      // Join room with username in options
      const room = await this.multiplayer.joinOrCreate("my_room", {
        username: this.username,
      });
      console.log(
        "Connected to room:",
        (room as any).roomId || (room as any).id
      );

      // Store our current session id for correct viewport-follow logic
      this.currentSessionId = room.sessionId;

      // Send username to server immediately after joining
      this.multiplayer.sendUsername(this.username, room.sessionId);

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

        // Update players list to show new kill count
        this.updatePlayersList();

        console.log(
          `Player ${message.killerSessionId} got a kill! Total: ${message.killerKills}`
        );
      });

      // Listen for health updates
      room.onMessage("health-update", (message: any) => {
        this.playerHealth[message.sessionId] = message.health;

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
            message.health
          );
        }

        // If enemy dies, destroy their tank
        if (
          message.health <= 0 &&
          message.sessionId !== this.currentSessionId
        ) {
          this.destroyPlayerTank(message.sessionId);
        }

        // Update UI if it's our health
        if (message.sessionId === this.currentSessionId) {
          this.ui.setHealth(message.health);

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
        }

        // Always create a new tank for each player added to the room
        const entity = await TankFactory.create({
          bodyTextureUrl: tankBody,
          gunTextureUrl: tankGun,
          scale: 0.25,
          initialX: 100,
          initialY: 100,
          username: playerUsername,
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
        // Sprites are at world positions, container is just a grouping
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

          // Add player's tank to the viewport
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
          this.viewport.follow(entity.body, { speed: 0 });
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
            // Update sprite positions
            entity.body.x = player.x;
            entity.body.y = player.y;
            entity.gun.x = player.x;
            entity.gun.y = player.y;
            // Update body rotation
            entity.body.rotation = player.rotation;
            // Update gun rotation
            entity.gun.rotation = player.gunRotation;
            // Update username label position and text if username changed
            if (entity.usernameLabel) {
              const usernameY = player.y - entity.body.height * 0.5 - 15;
              entity.usernameLabel.x = player.x;
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
                // Update players list if kills changed
                this.updatePlayersList();
              }

              // Update health bar position and value
              if (entity.healthBar && entity.healthBarBackground) {
                const healthBarWidth = 60;
                const healthBarHeight = 6;
                const healthBarX = player.x - healthBarWidth / 2;
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

    // Only update our own tank's controls/camera
    this.playerMovement?.update(deltaTime);

    // Collect tank hitboxes for collision detection (only alive players)
    const tankHitboxes: TankHitbox[] = [];
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
        this.currentSessionId
      );
    }
    this.ui?.updateMinimap();

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

    // Shoot bullet from gun position and rotation
    const bullet = this.gunManager.shoot(
      this.tankGunSprite.x,
      this.tankGunSprite.y,
      this.tankGunSprite.rotation,
      this.currentSessionId
    );

    if (bullet) {
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
    if (!this.currentSessionId || !this.multiplayer) {
      return;
    }

    // Send damage to server
    this.multiplayer.send("damage", {
      targetSessionId: targetSessionId,
      damage: bullet.damage,
    });
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

  /**
   * Update the players list modal with current players
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

    this.ui.destroy();
    this.removeChildren();
    this.viewport?.destroy();
  }
}
