import { Bullet, TankHitbox } from "../GunManager";

/**
 * Calculations Manager for GunManager
 * Handles all physics, collision, and bullet calculations
 */
export class GunManagerCalculations {
  private bulletSize: number;
  private bulletSpeed: number;
  private bulletSpeedMultiplier: number = 1.0;

  constructor(
    bulletSize: number,
    bulletSpeed: number,
    _bulletLifetime: number, // Used for initialization but not stored
    bulletSpeedMultiplier: number = 1.0
  ) {
    this.bulletSize = bulletSize;
    this.bulletSpeed = bulletSpeed;
    this.bulletSpeedMultiplier = bulletSpeedMultiplier;
  }

  /**
   * Calculate bullet velocity from gun rotation
   */
  public calculateBulletVelocity(gunRotation: number): {
    vx: number;
    vy: number;
    angle: number;
  } {
    // Gun rotation is in radians, with 0 pointing up (in PixiJS)
    // To convert back to standard angle (0 = right), we add Math.PI/2
    const bulletAngle = gunRotation + Math.PI / 2;
    const speed = this.bulletSpeed * this.bulletSpeedMultiplier;
    const vx = Math.cos(bulletAngle) * speed;
    const vy = Math.sin(bulletAngle) * speed;

    return { vx, vy, angle: bulletAngle };
  }

  /**
   * Calculate bullet spawn position at the end of gun barrel
   */
  public calculateBulletSpawnPosition(
    gunX: number,
    gunY: number,
    bulletAngle: number,
    gunLength: number = 30
  ): { x: number; y: number } {
    const spawnX = gunX + Math.cos(bulletAngle) * gunLength;
    const spawnY = gunY + Math.sin(bulletAngle) * gunLength;
    return { x: spawnX, y: spawnY };
  }

  /**
   * Update bullet position based on velocity
   */
  public updateBulletPosition(bullet: Bullet, deltaTime: number): void {
    bullet.x += bullet.vx * deltaTime;
    bullet.y += bullet.vy * deltaTime;
  }

  /**
   * Check if bullet is out of bounds
   */
  public isBulletOutOfBounds(
    bullet: Bullet,
    worldBounds: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    return (
      bullet.x < worldBounds.minX ||
      bullet.x > worldBounds.maxX ||
      bullet.y < worldBounds.minY ||
      bullet.y > worldBounds.maxY
    );
  }

  /**
   * Check if bullet has expired (lifetime <= 0)
   */
  public isBulletExpired(bullet: Bullet): boolean {
    return bullet.lifetime <= 0;
  }

  /**
   * Decrease bullet lifetime
   */
  public decreaseBulletLifetime(bullet: Bullet, deltaTime: number): void {
    bullet.lifetime -= deltaTime;
  }

  /**
   * Check collision between bullet and tank
   * Uses circle-rectangle collision detection
   */
  public checkBulletTankCollision(bullet: Bullet, tank: TankHitbox): boolean {
    // Don't hit the owner of the bullet
    if (tank.sessionId === bullet.ownerSessionId) {
      return false;
    }

    const bulletRadius = this.bulletSize;
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
    return distanceSquared < bulletRadius * bulletRadius;
  }

  /**
   * Find all tanks that collide with bullet
   */
  public findCollidingTanks(bullet: Bullet, tanks: TankHitbox[]): TankHitbox[] {
    const colliding: TankHitbox[] = [];

    for (const tank of tanks) {
      if (this.checkBulletTankCollision(bullet, tank)) {
        colliding.push(tank);
      }
    }

    return colliding;
  }

  /**
   * Update bullet speed multiplier
   */
  public setBulletSpeedMultiplier(multiplier: number): void {
    this.bulletSpeedMultiplier = Math.max(0.1, multiplier);
  }

  /**
   * Get bullet speed multiplier
   */
  public getBulletSpeedMultiplier(): number {
    return this.bulletSpeedMultiplier;
  }

  /**
   * Update configuration
   */
  public updateConfig(
    bulletSize?: number,
    bulletSpeed?: number,
    _bulletLifetime?: number // Not stored, used by caller
  ): void {
    if (bulletSize !== undefined) this.bulletSize = bulletSize;
    if (bulletSpeed !== undefined) this.bulletSpeed = bulletSpeed;
  }
}
