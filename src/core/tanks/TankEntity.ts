import { Container, Text, Graphics } from "pixi.js";
import { TankBaseFactory, TankBaseSprites } from "./TankBaseFactory";
import { TankGunFactory, TankGunSprites } from "./TankGunFactory";
import { TankConfigRegistry } from "./TankConfig";
import { TankEntityUI } from "./TankEntityUI";

export interface TankEntityConfig {
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

export interface TankEntitySprites {
  base: TankBaseSprites;
  gun: TankGunSprites;
  container: Container; // Container that holds base, gun, and UI elements
  usernameLabel?: Text;
  healthBar?: Graphics;
  healthBarBackground?: Graphics;
}

/**
 * Factory class for creating complete tank entities with base, gun, and UI elements.
 * This class assembles all visual components of a tank into a single entity.
 */
export class TankEntity {
  /**
   * Create a complete tank entity with base and gun
   */
  static async create(config: TankEntityConfig): Promise<TankEntitySprites> {
    // Default scale is 0.5 to make sprites 64x64 (from 128x128 base size)
    // If a scale is provided, use it directly (absolute scale, not relative)
    const scale = config.scale ?? 0.5;

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

    // Get gun Y offset from config if needed for fine-tuning alignment
    const gunConfig = TankConfigRegistry.getTankGun(config.gunId);
    const gunYOffset = gunConfig?.gunYOffset ?? 0;

    // Create main container
    const container = new Container();
    container.addChild(base.container);
    container.addChild(gun.container);

    // Apply gun Y offset if specified (moves entire gun sprite to align with tank center hole)
    if (gunYOffset !== 0) {
      gun.gun.y += gunYOffset;
      if (gun.gunBase) {
        gun.gunBase.y += gunYOffset;
      }
      if (gun.fireAnimation) {
        gun.fireAnimation.y += gunYOffset;
      }
    }

    // Create username label and health bar if provided
    let usernameLabel: Text | undefined;
    let healthBar: Graphics | undefined;
    let healthBarBackground: Graphics | undefined;

    if (config.username) {
      const usernameY = config.initialY - base.base.height * 0.5 - 15;

      // Create username label using UI manager
      usernameLabel = TankEntityUI.createUsernameLabel(
        config.username,
        config.initialX,
        config.initialY,
        base.base.height
      );
      container.addChild(usernameLabel);

      // Create health bar background
      healthBarBackground = TankEntityUI.createHealthBarBackground(
        config.initialX,
        config.initialY,
        usernameY
      );
      container.addChild(healthBarBackground);

      // Create health bar
      healthBar = TankEntityUI.createHealthBar(
        config.initialX,
        config.initialY,
        usernameY,
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
    };
  }

  /**
   * Update health bar graphics (delegates to UI manager)
   */
  static updateHealthBar(
    healthBar: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    health: number
  ): void {
    TankEntityUI.updateHealthBar(healthBar, x, y, width, height, health);
  }

  /**
   * Set tank to dead state
   */
  static setDead(sprites: TankEntitySprites): void {
    TankBaseFactory.setDead(sprites.base);
  }

  /**
   * Set tank to alive state
   */
  static setAlive(sprites: TankEntitySprites): void {
    TankBaseFactory.setAlive(sprites.base);
  }

  /**
   * Get tank speed
   */
  static getSpeed(sprites: TankEntitySprites): number {
    return TankBaseFactory.getSpeed(sprites.base);
  }

  /**
   * Get gun stats
   */
  static getGunStats(sprites: TankEntitySprites) {
    return TankGunFactory.getStats(sprites.gun);
  }

  /**
   * Play fire animation
   */
  static playFireAnimation(sprites: TankEntitySprites): void {
    TankGunFactory.playFireAnimation(sprites.gun);
  }

  /**
   * Update tank position
   */
  static updatePosition(
    sprites: TankEntitySprites,
    x: number,
    y: number
  ): void {
    TankBaseFactory.updatePosition(sprites.base, x, y);
    TankGunFactory.updatePosition(sprites.gun, x, y);

    // Update UI elements using UI manager
    TankEntityUI.updateUIPositions(
      sprites.usernameLabel,
      sprites.healthBar,
      sprites.healthBarBackground,
      x,
      y,
      sprites.base.base.height
    );
  }

  /**
   * Update tank rotation
   */
  static updateRotation(sprites: TankEntitySprites, rotation: number): void {
    TankBaseFactory.updateRotation(sprites.base, rotation);
  }

  /**
   * Update gun rotation
   */
  static updateGunRotation(sprites: TankEntitySprites, rotation: number): void {
    TankGunFactory.updateRotation(sprites.gun, rotation);
  }
}
