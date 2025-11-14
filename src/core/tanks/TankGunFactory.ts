import { Assets, Sprite, AnimatedSprite, Container } from "pixi.js";
import { TankConfigRegistry } from "./TankConfig";

export interface TankGunSprites {
  gun: Sprite | AnimatedSprite; // Main gun sprite
  gunBase?: Sprite; // Gun base/platform sprite (optional)
  fireAnimation?: AnimatedSprite; // Fire/muzzle flash animation (optional)
  container: Container; // Container holding all gun sprites
}

export interface TankGunFactoryConfig {
  gunId: string; // ID of registered tank gun
  initialX: number;
  initialY: number;
  scale?: number; // Override scale from config
  customRange?: number; // Override range from config
  customFireRate?: number; // Override fire rate from config
  customDamage?: number; // Override damage from config
  customBulletSpeed?: number; // Override bullet speed from config
}

export interface TankGunStats {
  range: number;
  fireRate: number; // Shots per second
  damage: number;
  bulletSpeed: number;
}

export class TankGunFactory {
  /**
   * Create a tank gun from registered configuration
   */
  static async create(config: TankGunFactoryConfig): Promise<TankGunSprites> {
    const gunConfig = TankConfigRegistry.getTankGun(config.gunId);
    if (!gunConfig) {
      throw new Error(
        `Tank gun with id "${config.gunId}" not found in registry`
      );
    }

    const container = new Container();
    // Scale is not applied - sprites use their natural size

    // Load and create main gun sprite
    const gunTexture = await Assets.load(gunConfig.gunTextureUrl);
    let gunSprite: Sprite | AnimatedSprite;

    // If animation textures are provided, create animated sprite
    if (gunConfig.animationTextures && gunConfig.animationTextures.length > 0) {
      const animationTextures = await Promise.all(
        gunConfig.animationTextures.map((url) => Assets.load(url))
      );
      gunSprite = new AnimatedSprite(animationTextures);
      (gunSprite as AnimatedSprite).animationSpeed = 0.1;
      // Don't auto-play - animation will only play when shooting
      (gunSprite as AnimatedSprite).loop = false; // Play once per shoot
      (gunSprite as AnimatedSprite).stop(); // Start stopped
    } else {
      gunSprite = new Sprite(gunTexture);
    }

    gunSprite.scale.set(1.0, 1.0); // No scaling applied
    gunSprite.x = config.initialX;
    gunSprite.y = config.initialY;
    gunSprite.anchor.set(0.5);
    gunSprite.rotation = 0;

    container.addChild(gunSprite);

    // Load and create gun base if provided
    let gunBaseSprite: Sprite | undefined;
    if (gunConfig.gunBaseTextureUrl) {
      const gunBaseTexture = await Assets.load(gunConfig.gunBaseTextureUrl);
      gunBaseSprite = new Sprite(gunBaseTexture);
      gunBaseSprite.scale.set(1.0, 1.0); // No scaling applied
      gunBaseSprite.x = config.initialX;
      gunBaseSprite.y = config.initialY;
      gunBaseSprite.anchor.set(0.5);
      container.addChildAt(gunBaseSprite, 0); // Add behind gun
    }

    // Load and create fire animation if provided
    let fireAnimation: AnimatedSprite | undefined;
    if (
      gunConfig.fireAnimationTextures &&
      gunConfig.fireAnimationTextures.length > 0
    ) {
      const fireTextures = await Promise.all(
        gunConfig.fireAnimationTextures.map((url) => Assets.load(url))
      );
      fireAnimation = new AnimatedSprite(fireTextures);
      fireAnimation.animationSpeed = 0.2;
      fireAnimation.loop = false; // Fire animation should play once
      fireAnimation.visible = false; // Hidden by default
      fireAnimation.scale.set(1.0, 1.0); // No scaling applied
      fireAnimation.anchor.set(0.5);
      fireAnimation.x = config.initialX;
      fireAnimation.y = config.initialY;
      container.addChild(fireAnimation);
    }

    // Store gun stats in container for easy access
    (container as any).gunStats = {
      range: config.customRange ?? gunConfig.range,
      fireRate: config.customFireRate ?? gunConfig.fireRate,
      damage: config.customDamage ?? gunConfig.damage,
      bulletSpeed: config.customBulletSpeed ?? gunConfig.bulletSpeed,
    };

    return {
      gun: gunSprite,
      gunBase: gunBaseSprite,
      fireAnimation: fireAnimation,
      container: container,
    };
  }

  /**
   * Get gun stats from sprites
   */
  static getStats(sprites: TankGunSprites): TankGunStats {
    return (
      (sprites.container as any).gunStats ?? {
        range: 1000,
        fireRate: 2,
        damage: 10,
        bulletSpeed: 1.0,
      }
    );
  }

  /**
   * Play fire animation and gun animation (if gun is animated)
   */
  static playFireAnimation(sprites: TankGunSprites): void {
    // Play gun animation if it's an AnimatedSprite
    if (sprites.gun instanceof AnimatedSprite) {
      sprites.gun.gotoAndPlay(0);
      // Reset to first frame when animation completes
      sprites.gun.onComplete = () => {
        if (sprites.gun instanceof AnimatedSprite) {
          sprites.gun.gotoAndStop(0);
        }
      };
    }

    // Play fire/muzzle flash animation if available
    if (sprites.fireAnimation) {
      // Sync fire animation position and rotation with gun before playing
      sprites.fireAnimation.x = sprites.gun.x;
      sprites.fireAnimation.y = sprites.gun.y;
      sprites.fireAnimation.rotation = sprites.gun.rotation;

      sprites.fireAnimation.visible = true;
      sprites.fireAnimation.gotoAndPlay(0);

      // Hide animation after it finishes
      sprites.fireAnimation.onComplete = () => {
        if (sprites.fireAnimation) {
          sprites.fireAnimation.visible = false;
        }
      };
    }
  }

  /**
   * Update gun position
   */
  static updatePosition(sprites: TankGunSprites, x: number, y: number): void {
    sprites.gun.x = x;
    sprites.gun.y = y;
    if (sprites.gunBase) {
      sprites.gunBase.x = x;
      sprites.gunBase.y = y;
    }
    if (sprites.fireAnimation) {
      sprites.fireAnimation.x = x;
      sprites.fireAnimation.y = y;
    }
  }

  /**
   * Update gun rotation
   */
  static updateRotation(sprites: TankGunSprites, rotation: number): void {
    sprites.gun.rotation = rotation;
    // Gun base typically doesn't rotate, but fire animation might
    if (sprites.fireAnimation) {
      sprites.fireAnimation.rotation = rotation;
    }
  }
}
