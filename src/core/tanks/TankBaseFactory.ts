import { Assets, Sprite, AnimatedSprite, Container } from "pixi.js";
import { TankConfigRegistry } from "./TankConfig";

export interface TankBaseSprites {
  base: Sprite | AnimatedSprite; // Main tank base sprite
  dead: Sprite; // Dead tank base sprite
  container: Container; // Container holding all base sprites
  isDead: boolean; // Current state
}

export interface TankBaseFactoryConfig {
  baseId: string; // ID of registered tank base
  initialX: number;
  initialY: number;
  scale?: number; // Override scale from config
  customSpeed?: number; // Override speed from config
}

export class TankBaseFactory {
  /**
   * Create a tank base from registered configuration
   */
  static async create(config: TankBaseFactoryConfig): Promise<TankBaseSprites> {
    const baseConfig = TankConfigRegistry.getTankBase(config.baseId);
    if (!baseConfig) {
      throw new Error(
        `Tank base with id "${config.baseId}" not found in registry`
      );
    }

    const container = new Container();
    // Scale is not applied - sprites use their natural size

    // Load and create main tank base sprite
    const baseTexture = await Assets.load(baseConfig.baseTextureUrl);
    let baseSprite: Sprite | AnimatedSprite;

    // If animation textures are provided, create animated sprite
    if (
      baseConfig.animationTextures &&
      baseConfig.animationTextures.length > 0
    ) {
      const animationTextures = await Promise.all(
        baseConfig.animationTextures.map((url) => Assets.load(url))
      );
      baseSprite = new AnimatedSprite(animationTextures);
      (baseSprite as AnimatedSprite).animationSpeed = 0.1; // Adjust animation speed as needed
      (baseSprite as AnimatedSprite).play();
    } else {
      baseSprite = new Sprite(baseTexture);
    }

    baseSprite.scale.set(1.0, 1.0); // No scaling applied
    baseSprite.x = config.initialX;
    baseSprite.y = config.initialY;
    baseSprite.anchor.set(0.5);
    baseSprite.visible = true;

    // Load and create dead tank base sprite
    const deadTexture = await Assets.load(baseConfig.deadTextureUrl);
    const deadSprite = new Sprite(deadTexture);
    deadSprite.scale.set(1.0, 1.0); // No scaling applied
    deadSprite.x = config.initialX;
    deadSprite.y = config.initialY;
    deadSprite.anchor.set(0.5);
    deadSprite.visible = false; // Hidden by default

    // Add to container
    container.addChild(baseSprite);
    container.addChild(deadSprite);

    // Store speed in container for easy access
    (container as any).tankSpeed = config.customSpeed ?? baseConfig.speed;

    return {
      base: baseSprite,
      dead: deadSprite,
      container: container,
      isDead: false,
    };
  }

  /**
   * Switch tank base to dead state
   */
  static setDead(sprites: TankBaseSprites): void {
    if (sprites.isDead) return;

    sprites.isDead = true;
    sprites.base.visible = false;
    sprites.dead.visible = true;

    // Stop animation if it's an animated sprite
    if (sprites.base instanceof AnimatedSprite) {
      sprites.base.stop();
    }
  }

  /**
   * Switch tank base to alive state
   */
  static setAlive(sprites: TankBaseSprites): void {
    if (!sprites.isDead) return;

    sprites.isDead = false;
    sprites.base.visible = true;
    sprites.dead.visible = false;

    // Resume animation if it's an animated sprite
    if (sprites.base instanceof AnimatedSprite) {
      sprites.base.play();
    }
  }

  /**
   * Get tank speed from sprites
   */
  static getSpeed(sprites: TankBaseSprites): number {
    return (sprites.container as any).tankSpeed ?? 1.0;
  }

  /**
   * Update tank base position
   */
  static updatePosition(sprites: TankBaseSprites, x: number, y: number): void {
    sprites.base.x = x;
    sprites.base.y = y;
    sprites.dead.x = x;
    sprites.dead.y = y;
  }

  /**
   * Update tank base rotation
   */
  static updateRotation(sprites: TankBaseSprites, rotation: number): void {
    sprites.base.rotation = rotation;
    sprites.dead.rotation = rotation;
  }
}
