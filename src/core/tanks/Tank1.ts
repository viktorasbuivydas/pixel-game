import { Container, Text, TextStyle, Graphics } from "pixi.js";
import { TankBaseFactory, TankBaseSprites } from "./TankBaseFactory";
import { TankGunFactory, TankGunSprites } from "./TankGunFactory";
import { TankConfigRegistry } from "./TankConfig";

export interface Tank1Config {
  baseId: string; // ID of registered tank base
  gunId: string; // ID of registered tank gun
  initialX: number;
  initialY: number;
  scale?: number;
  username?: string;
  // Optional overrides
  customTankSpeed?: number;
  customGunRange?: number;
  customFireRate?: number;
  customDamage?: number;
  customBulletSpeed?: number;
}

export interface Tank1Sprites {
  base: TankBaseSprites;
  gun: TankGunSprites;
  container: Container; // Container that holds base, gun, and UI elements
  usernameLabel?: Text;
  healthBar?: Graphics;
  healthBarBackground?: Graphics;
  gunYOffset?: number; // Y offset for gun position relative to tank base center
}

export class Tank1 {
  /**
   * Create a complete tank with base and gun
   */
  static async create(config: Tank1Config): Promise<Tank1Sprites> {
    const scale = config.scale ?? 1.0;

    // Create tank base
    const base = await TankBaseFactory.create({
      baseId: config.baseId,
      initialX: config.initialX,
      initialY: config.initialY,
      scale: scale,
      customSpeed: config.customTankSpeed,
    });

    // Create tank gun
    const gun = await TankGunFactory.create({
      gunId: config.gunId,
      initialX: config.initialX,
      initialY: config.initialY,
      scale: scale,
      customRange: config.customGunRange,
      customFireRate: config.customFireRate,
      customDamage: config.customDamage,
      customBulletSpeed: config.customBulletSpeed,
    });

    // Get gun Y offset from configs
    // Base can have per-gun offsets (gunYOffsets map) or a general offset (gunYOffset)
    // Gun can also have its own offset - they are combined (additive)
    const gunConfig = TankConfigRegistry.getTankGun(config.gunId);
    const baseYOffset = TankConfigRegistry.getGunYOffsetForBase(
      config.baseId,
      config.gunId
    );
    const gunYOffset = gunConfig?.gunYOffset ?? 0;
    // Combine both offsets (base offset + gun offset) for fine-tuning
    const totalGunYOffset = baseYOffset + gunYOffset;

    // Create main container
    const container = new Container();
    container.addChild(base.container);
    container.addChild(gun.container);

    // Adjust gun position with Y offset
    gun.gun.y += totalGunYOffset;
    if (gun.gunBase) {
      gun.gunBase.y += totalGunYOffset;
    }
    if (gun.fireAnimation) {
      gun.fireAnimation.y += totalGunYOffset;
    }

    // Create username label if provided
    let usernameLabel: Text | undefined;
    let healthBar: Graphics | undefined;
    let healthBarBackground: Graphics | undefined;

    if (config.username) {
      const usernameStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "center",
        stroke: { color: 0x000000, width: 2 },
      });

      usernameLabel = new Text({
        text: config.username,
        style: usernameStyle,
      });
      usernameLabel.anchor.set(0.5);
      const usernameY = config.initialY - base.base.height * 0.5 - 15;
      usernameLabel.x = config.initialX;
      usernameLabel.y = usernameY;
      usernameLabel.zIndex = 100;
      container.addChild(usernameLabel);

      // Create health bar below username
      const healthBarWidth = 60;
      const healthBarHeight = 6;
      const healthBarX = config.initialX - healthBarWidth / 2;
      const healthBarY = usernameY + 12;

      // Health bar background
      healthBarBackground = new Graphics();
      healthBarBackground.roundRect(
        healthBarX,
        healthBarY,
        healthBarWidth,
        healthBarHeight,
        2
      );
      healthBarBackground.fill(0x333333);
      healthBarBackground.stroke({ width: 1, color: 0x000000 });
      healthBarBackground.zIndex = 99;
      container.addChild(healthBarBackground);

      // Health bar
      healthBar = new Graphics();
      healthBar.zIndex = 100;
      // Initialize with full health (100)
      this.updateHealthBar(
        healthBar,
        healthBarX,
        healthBarY,
        healthBarWidth,
        healthBarHeight,
        100
      );
      container.addChild(healthBar);
    }

    return {
      base: base,
      gun: gun,
      container: container,
      usernameLabel: usernameLabel,
      healthBar: healthBar,
      healthBarBackground: healthBarBackground,
      gunYOffset: gunYOffset,
    };
  }

  /**
   * Update health bar graphics
   */
  static updateHealthBar(
    healthBar: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    health: number
  ): void {
    const maxHealth = 100;
    const healthPercent = Math.max(0, Math.min(100, health)) / maxHealth;
    const currentWidth = width * healthPercent;

    healthBar.clear();

    // Color based on health percentage
    let healthColor = 0x00ff00; // Green
    if (healthPercent < 0.3) {
      healthColor = 0xff0000; // Red
    } else if (healthPercent < 0.6) {
      healthColor = 0xffff00; // Yellow
    }

    if (currentWidth > 0) {
      healthBar.roundRect(x, y, currentWidth, height, 2);
      healthBar.fill(healthColor);
      healthBar.stroke({ width: 1, color: 0xffffff });
    }
  }

  /**
   * Set tank to dead state
   */
  static setDead(sprites: Tank1Sprites): void {
    TankBaseFactory.setDead(sprites.base);
  }

  /**
   * Set tank to alive state
   */
  static setAlive(sprites: Tank1Sprites): void {
    TankBaseFactory.setAlive(sprites.base);
  }

  /**
   * Get tank speed
   */
  static getSpeed(sprites: Tank1Sprites): number {
    return TankBaseFactory.getSpeed(sprites.base);
  }

  /**
   * Get gun stats
   */
  static getGunStats(sprites: Tank1Sprites) {
    return TankGunFactory.getStats(sprites.gun);
  }

  /**
   * Play fire animation
   */
  static playFireAnimation(sprites: Tank1Sprites): void {
    TankGunFactory.playFireAnimation(sprites.gun);
  }

  /**
   * Update tank position
   */
  static updatePosition(sprites: Tank1Sprites, x: number, y: number): void {
    TankBaseFactory.updatePosition(sprites.base, x, y);
    TankGunFactory.updatePosition(sprites.gun, x, y);

    // Update UI elements
    if (sprites.usernameLabel) {
      const usernameY = y - sprites.base.base.height * 0.5 - 15;
      sprites.usernameLabel.x = x;
      sprites.usernameLabel.y = usernameY;

      if (sprites.healthBar && sprites.healthBarBackground) {
        const healthBarWidth = 60;
        const healthBarHeight = 6;
        const healthBarX = x - healthBarWidth / 2;
        const healthBarY = usernameY + 12;

        sprites.healthBarBackground.clear();
        sprites.healthBarBackground.roundRect(
          healthBarX,
          healthBarY,
          healthBarWidth,
          healthBarHeight,
          2
        );
        sprites.healthBarBackground.fill(0x333333);
        sprites.healthBarBackground.stroke({ width: 1, color: 0x000000 });

        // Update health bar position (value should be updated separately)
        const currentHealth = (sprites.healthBar as any).currentHealth ?? 100;
        this.updateHealthBar(
          sprites.healthBar,
          healthBarX,
          healthBarY,
          healthBarWidth,
          healthBarHeight,
          currentHealth
        );
      }
    }
  }

  /**
   * Update tank rotation
   */
  static updateRotation(sprites: Tank1Sprites, rotation: number): void {
    TankBaseFactory.updateRotation(sprites.base, rotation);
  }

  /**
   * Update gun rotation
   */
  static updateGunRotation(sprites: Tank1Sprites, rotation: number): void {
    TankGunFactory.updateRotation(sprites.gun, rotation);
  }
}
