import { Container } from "pixi.js";
import { GunManagerUI } from "./gunManager/GunManagerUI";
import { GunManagerCalculations } from "./gunManager/GunManagerCalculations";
import { GunManagerDebugger } from "./gunManager/GunManagerDebugger";

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
  sprite: any; // Graphics sprite
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

/**
 * GunManager - Manages bullet creation, movement, and collision
 *
 * This class has been refactored into separate modules:
 * - GunManagerUI: Handles bullet sprite generation and visual updates
 * - GunManagerCalculations: Handles all physics and collision calculations
 * - GunManagerDebugger: Provides debugging utilities
 */
export class GunManager {
  private config: GunConfig;
  private bullets: Bullet[] = [];
  private container: Container;
  private lastShotTime: number = 0;
  private onHitCallback?: (bullet: Bullet, targetSessionId: string) => void;

  // Modules
  private ui: GunManagerUI;
  private calculations: GunManagerCalculations;

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
    onHit?: (bullet: Bullet, targetSessionId: string) => void,
    debugEnabled?: boolean
  ) {
    this.container = container;
    this.config = { ...GunManager.DEFAULT_CONFIG, ...config };
    this.onHitCallback = onHit;

    // Initialize modules
    this.ui = new GunManagerUI(container, this.config.bulletSize);
    this.calculations = new GunManagerCalculations(
      this.config.bulletSize,
      this.config.bulletSpeed,
      this.config.bulletLifetime
    );

    if (debugEnabled) {
      GunManagerDebugger.setEnabled(true);
    }
  }

  /**
   * Update gun configuration
   */
  updateConfig(config: Partial<GunConfig>): void {
    this.config = { ...this.config, ...config };
    this.calculations.updateConfig(
      config.bulletSize,
      config.bulletSpeed,
      config.bulletLifetime
    );
    if (config.bulletSize) {
      // Recreate UI with new bullet size
      this.ui = new GunManagerUI(this.container, config.bulletSize);
    }
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
    this.calculations.setBulletSpeedMultiplier(multiplier);
  }

  /**
   * Check if player can shoot (fire rate cooldown)
   */
  canFire(): boolean {
    const now = Date.now();
    const timeSinceLastShot = now - this.lastShotTime;
    const fireRateMs = 1000 / this.config.fireRate;
    const canFire = timeSinceLastShot >= fireRateMs;

    GunManagerDebugger.logFireRateCheck(canFire, timeSinceLastShot, fireRateMs);

    return canFire;
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

    // Calculate bullet velocity and angle
    const {
      vx,
      vy,
      angle: bulletAngle,
    } = this.calculations.calculateBulletVelocity(gunRotation);

    // Calculate spawn position
    const { x: spawnX, y: spawnY } =
      this.calculations.calculateBulletSpawnPosition(gunX, gunY, bulletAngle);

    // Create bullet sprite
    const bulletSprite = this.ui.createBulletSprite(
      spawnX,
      spawnY,
      gunRotation
    );

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
    GunManagerDebugger.logBulletCreated(bullet);

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
      this.calculations.updateBulletPosition(bullet, deltaTime);
      this.ui.updateBulletSprite(bullet);

      // Check collision with tanks
      if (tanks && tanks.length > 0) {
        const collidingTanks = this.calculations.findCollidingTanks(
          bullet,
          tanks
        );

        if (collidingTanks.length > 0) {
          // Hit detected! Use first colliding tank
          const hitTank = collidingTanks[0];
          bullet.hasHit = true;

          GunManagerDebugger.logBulletHit(bullet, hitTank.sessionId);

          if (this.onHitCallback) {
            this.onHitCallback(bullet, hitTank.sessionId);
          }

          bulletsToRemove.push(index);
          return;
        }
      }

      // Decrease lifetime
      this.calculations.decreaseBulletLifetime(bullet, deltaTime);

      // Check if bullet should be removed
      if (this.calculations.isBulletExpired(bullet)) {
        GunManagerDebugger.logBulletRemoved(bullet, "expired");
        bulletsToRemove.push(index);
        return;
      }

      // Check world bounds
      if (
        worldBounds &&
        this.calculations.isBulletOutOfBounds(bullet, worldBounds)
      ) {
        GunManagerDebugger.logBulletRemoved(bullet, "outOfBounds");
        bulletsToRemove.push(index);
        return;
      }
    });

    // Remove expired bullets (in reverse order to maintain indices)
    bulletsToRemove.reverse().forEach((index) => {
      const bullet = this.bullets[index];
      this.ui.removeBulletSprite(bullet);
      this.bullets.splice(index, 1);
    });

    // Log bullet statistics
    GunManagerDebugger.logBulletStats(this.bullets);
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
      this.ui.removeBulletSprite(bullet);
      GunManagerDebugger.logBulletRemoved(bullet, "manual");
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
    const bulletSprite = this.ui.createBulletSprite(
      x,
      y,
      rotation - Math.PI / 2
    );

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
    GunManagerDebugger.logBulletCreated(bullet);

    return bullet;
  }

  /**
   * Remove all bullets
   */
  clearBullets(): void {
    this.bullets.forEach((bullet) => {
      this.ui.removeBulletSprite(bullet);
    });
    this.bullets = [];
  }

  /**
   * Destroy the gun manager and clean up
   */
  destroy(): void {
    this.clearBullets();
  }

  /**
   * Enable/disable debug logging
   */
  public setDebugEnabled(enabled: boolean): void {
    GunManagerDebugger.setEnabled(enabled);
  }
}
