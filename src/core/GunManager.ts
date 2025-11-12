import { Graphics, Container } from "pixi.js";

export interface GunConfig {
  damage: number;
  fireRate: number; // Shots per second
  bulletSpeed: number; // Pixels per frame
  bulletLifetime: number; // Frames before bullet despawns
  bulletSize: number; // Bullet radius
  reloadTime?: number; // Time in ms to reload (optional)
  maxAmmo?: number; // Maximum ammo (optional, for future use)
}

export interface Bullet {
  sprite: Graphics;
  x: number;
  y: number;
  vx: number; // Velocity X
  vy: number; // Velocity Y
  rotation: number;
  lifetime: number;
  ownerSessionId: string;
  damage: number;
  hasHit: boolean; // Track if bullet has already hit something
}

export interface TankHitbox {
  x: number;
  y: number;
  width: number;
  height: number;
  sessionId: string;
}

export class GunManager {
  private config: GunConfig;
  private bullets: Bullet[] = [];
  private container: Container;
  private lastShotTime: number = 0;
  private onHitCallback?: (bullet: Bullet, targetSessionId: string) => void;
  private bulletSpeedMultiplier: number = 1.0;

  // Default gun configuration
  private static readonly DEFAULT_CONFIG: GunConfig = {
    damage: 10,
    fireRate: 2, // 2 shots per second
    bulletSpeed: 8, // pixels per frame
    bulletLifetime: 300, // frames (about 5 seconds at 60fps)
    bulletSize: 4, // radius
    reloadTime: 0, // No reload for now
    maxAmmo: Infinity, // Unlimited ammo for now
  };

  constructor(
    container: Container,
    config?: Partial<GunConfig>,
    onHit?: (bullet: Bullet, targetSessionId: string) => void
  ) {
    this.container = container;
    this.config = { ...GunManager.DEFAULT_CONFIG, ...config };
    this.onHitCallback = onHit;
  }

  /**
   * Update gun configuration
   */
  updateConfig(config: Partial<GunConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current gun configuration
   */
  getConfig(): GunConfig {
    return { ...this.config };
  }

  /**
   * Set bullet speed multiplier (for debug/testing)
   */
  setBulletSpeedMultiplier(multiplier: number): void {
    this.bulletSpeedMultiplier = Math.max(0.1, multiplier);
  }

  /**
   * Check if player can shoot (fire rate cooldown)
   */
  canFire(): boolean {
    const now = Date.now();
    const timeSinceLastShot = now - this.lastShotTime;
    const fireRateMs = 1000 / this.config.fireRate;
    return timeSinceLastShot >= fireRateMs;
  }

  /**
   * Shoot a bullet from gun position and rotation
   */
  shoot(
    gunX: number,
    gunY: number,
    gunRotation: number,
    ownerSessionId: string
  ): Bullet | null {
    if (!this.canFire()) {
      return null;
    }

    this.lastShotTime = Date.now();

    // Calculate bullet direction from gun rotation
    // Gun rotation is in radians, with 0 pointing up (in PixiJS)
    const bulletAngle = gunRotation - Math.PI / 2; // Convert to standard angle
    const bulletSpeed = this.config.bulletSpeed * this.bulletSpeedMultiplier;
    const vx = Math.cos(bulletAngle) * bulletSpeed;
    const vy = Math.sin(bulletAngle) * bulletSpeed;

    // Create bullet sprite (simple circle for now)
    const bulletSprite = new Graphics();
    bulletSprite.circle(0, 0, this.config.bulletSize);
    bulletSprite.fill(0xffff00); // Yellow bullet
    bulletSprite.stroke({ width: 1, color: 0xffaa00 });
    bulletSprite.x = gunX;
    bulletSprite.y = gunY;
    bulletSprite.rotation = gunRotation;
    bulletSprite.zIndex = 150; // Above fog and tanks

    // Calculate spawn position (at the end of the gun barrel)
    const gunLength = 30; // Approximate gun length in pixels
    const spawnX = gunX + Math.cos(bulletAngle) * gunLength;
    const spawnY = gunY + Math.sin(bulletAngle) * gunLength;
    bulletSprite.x = spawnX;
    bulletSprite.y = spawnY;

    this.container.addChild(bulletSprite);

    // Create bullet object
    const bullet: Bullet = {
      sprite: bulletSprite,
      x: spawnX,
      y: spawnY,
      vx,
      vy,
      rotation: bulletAngle,
      lifetime: this.config.bulletLifetime,
      ownerSessionId,
      damage: this.config.damage,
      hasHit: false,
    };

    this.bullets.push(bullet);
    return bullet;
  }

  /**
   * Update all bullets (movement, lifetime, collision)
   */
  update(
    deltaTime: number,
    worldBounds?: { minX: number; minY: number; maxX: number; maxY: number },
    tanks?: TankHitbox[]
  ): void {
    const bulletsToRemove: number[] = [];

    this.bullets.forEach((bullet, index) => {
      // Skip if bullet already hit something
      if (bullet.hasHit) {
        bulletsToRemove.push(index);
        return;
      }

      // Update position
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;
      bullet.sprite.x = bullet.x;
      bullet.sprite.y = bullet.y;

      // Check collision with tanks
      if (tanks) {
        for (const tank of tanks) {
          // Don't hit the owner of the bullet
          if (tank.sessionId === bullet.ownerSessionId) {
            continue;
          }

          // Simple circle-rectangle collision detection
          const bulletRadius = this.config.bulletSize;
          const tankLeft = tank.x - tank.width / 2;
          const tankRight = tank.x + tank.width / 2;
          const tankTop = tank.y - tank.height / 2;
          const tankBottom = tank.y + tank.height / 2;

          // Find closest point on rectangle to bullet center
          const closestX = Math.max(tankLeft, Math.min(bullet.x, tankRight));
          const closestY = Math.max(tankTop, Math.min(bullet.y, tankBottom));

          // Calculate distance from bullet to closest point
          const dx = bullet.x - closestX;
          const dy = bullet.y - closestY;
          const distanceSquared = dx * dx + dy * dy;

          // Check if bullet collides with tank
          if (distanceSquared < bulletRadius * bulletRadius) {
            // Hit detected!
            bullet.hasHit = true;
            if (this.onHitCallback) {
              this.onHitCallback(bullet, tank.sessionId);
            }
            bulletsToRemove.push(index);
            return;
          }
        }
      }

      // Decrease lifetime
      bullet.lifetime -= deltaTime;

      // Check if bullet should be removed
      if (bullet.lifetime <= 0) {
        bulletsToRemove.push(index);
        return;
      }

      // Check world bounds
      if (worldBounds) {
        if (
          bullet.x < worldBounds.minX ||
          bullet.x > worldBounds.maxX ||
          bullet.y < worldBounds.minY ||
          bullet.y > worldBounds.maxY
        ) {
          bulletsToRemove.push(index);
          return;
        }
      }
    });

    // Remove expired bullets (in reverse order to maintain indices)
    bulletsToRemove.reverse().forEach((index) => {
      const bullet = this.bullets[index];
      if (bullet.sprite.parent) {
        bullet.sprite.parent.removeChild(bullet.sprite);
      }
      bullet.sprite.destroy();
      this.bullets.splice(index, 1);
    });
  }

  /**
   * Get all active bullets
   */
  getBullets(): Bullet[] {
    return [...this.bullets];
  }

  /**
   * Remove a bullet by index
   */
  removeBullet(index: number): void {
    if (index >= 0 && index < this.bullets.length) {
      const bullet = this.bullets[index];
      if (bullet.sprite.parent) {
        bullet.sprite.parent.removeChild(bullet.sprite);
      }
      bullet.sprite.destroy();
      this.bullets.splice(index, 1);
    }
  }

  /**
   * Add a remote bullet (from another player)
   */
  addRemoteBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    rotation: number,
    ownerSessionId: string
  ): Bullet {
    // Create bullet sprite
    const bulletSprite = new Graphics();
    bulletSprite.circle(0, 0, this.config.bulletSize);
    bulletSprite.fill(0xffff00); // Yellow bullet
    bulletSprite.stroke({ width: 1, color: 0xffaa00 });
    bulletSprite.x = x;
    bulletSprite.y = y;
    bulletSprite.rotation = rotation;
    bulletSprite.zIndex = 150;

    this.container.addChild(bulletSprite);

    // Create bullet object
    const bullet: Bullet = {
      sprite: bulletSprite,
      x,
      y,
      vx,
      vy,
      rotation,
      lifetime: this.config.bulletLifetime,
      ownerSessionId,
      damage: this.config.damage,
      hasHit: false,
    };

    this.bullets.push(bullet);
    return bullet;
  }

  /**
   * Remove all bullets
   */
  clearBullets(): void {
    this.bullets.forEach((bullet) => {
      if (bullet.sprite.parent) {
        bullet.sprite.parent.removeChild(bullet.sprite);
      }
      bullet.sprite.destroy();
    });
    this.bullets = [];
  }

  /**
   * Destroy the gun manager and clean up
   */
  destroy(): void {
    this.clearBullets();
  }
}
