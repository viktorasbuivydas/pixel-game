import { Bullet } from "../GunManager";

/**
 * Debug utilities for GunManager
 */
export class GunManagerDebugger {
  private static enabled: boolean = false;
  private static logInterval: number = 0;
  private static frameCount: number = 0;
  private static logEveryNFrames: number = 60;

  /**
   * Enable/disable debug logging
   */
  public static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set how often to log (in frames)
   */
  public static setLogInterval(frames: number): void {
    this.logEveryNFrames = frames;
  }

  /**
   * Log bullet creation
   */
  public static logBulletCreated(bullet: Bullet): void {
    if (!this.enabled) return;
    console.log("[GunManager] Bullet Created", {
      id: bullet.ownerSessionId,
      position: `(${bullet.x.toFixed(2)}, ${bullet.y.toFixed(2)})`,
      velocity: `(${bullet.vx.toFixed(2)}, ${bullet.vy.toFixed(2)})`,
      rotation: `${(bullet.rotation * (180 / Math.PI)).toFixed(2)}°`,
      damage: bullet.damage,
      lifetime: bullet.lifetime,
    });
  }

  /**
   * Log bullet hit
   */
  public static logBulletHit(bullet: Bullet, targetSessionId: string): void {
    if (!this.enabled) return;
    console.log("[GunManager] Bullet Hit", {
      bulletOwner: bullet.ownerSessionId,
      target: targetSessionId,
      position: `(${bullet.x.toFixed(2)}, ${bullet.y.toFixed(2)})`,
      damage: bullet.damage,
    });
  }

  /**
   * Log bullet removal
   */
  public static logBulletRemoved(
    bullet: Bullet,
    reason: "expired" | "outOfBounds" | "hit" | "manual"
  ): void {
    if (!this.enabled) return;
    this.frameCount++;
    if (this.frameCount % this.logEveryNFrames !== 0) return;

    console.log("[GunManager] Bullet Removed", {
      reason,
      owner: bullet.ownerSessionId,
      position: `(${bullet.x.toFixed(2)}, ${bullet.y.toFixed(2)})`,
      lifetimeRemaining: bullet.lifetime.toFixed(2),
    });
  }

  /**
   * Log bullet statistics
   */
  public static logBulletStats(bullets: Bullet[]): void {
    if (!this.enabled) return;
    this.frameCount++;
    if (this.frameCount % this.logEveryNFrames !== 0) return;

    const active = bullets.filter((b) => !b.hasHit).length;
    const hit = bullets.filter((b) => b.hasHit).length;

    console.log("[GunManager] Bullet Stats", {
      total: bullets.length,
      active,
      hit,
    });
  }

  /**
   * Log fire rate check
   */
  public static logFireRateCheck(
    canFire: boolean,
    timeSinceLastShot: number,
    fireRateMs: number
  ): void {
    if (!this.enabled) return;
    if (canFire) return; // Only log when can't fire

    console.log("[GunManager] Fire Rate Cooldown", {
      canFire,
      timeSinceLastShot: `${timeSinceLastShot.toFixed(2)}ms`,
      required: `${fireRateMs.toFixed(2)}ms`,
      remaining: `${(fireRateMs - timeSinceLastShot).toFixed(2)}ms`,
    });
  }

  /**
   * Log a warning
   */
  public static warn(message: string, data?: any): void {
    if (!this.enabled) return;
    console.warn(`[GunManager] ${message}`, data || "");
  }

  /**
   * Log an error
   */
  public static error(message: string, error?: Error): void {
    console.error(`[GunManager] ${message}`, error || "");
  }
}
