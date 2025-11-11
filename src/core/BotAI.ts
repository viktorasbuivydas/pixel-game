import { Sprite } from "pixi.js";
import { WorldBounds } from "../types/WorldBounds";

export interface BotConfig {
  tankBody: Sprite;
  tankGun: Sprite;
  worldBounds: WorldBounds;
  moveSpeed?: number;
  rotationSpeed?: number;
  shootRange?: number;
  shootCooldown?: number;
}

export class BotAI {
  private tankBody: Sprite;
  private tankGun: Sprite;
  private worldBounds: WorldBounds;
  private moveSpeed: number;
  private rotationSpeed: number;
  private shootRange: number;
  private shootCooldown: number;
  private botId: string = ""; // Store bot ID for self-identification

  // AI state
  private targetX: number = 0;
  private targetY: number = 0;
  private targetAngle: number = 0;
  private gunTargetAngle: number = 0;
  private currentAngle: number = 0;
  private currentGunAngle: number = 0;
  private lastShotTime: number = 0;
  private lastTargetChangeTime: number = 0;
  private targetChangeInterval: number = 3000; // Change target every 3 seconds
  private dodgeDirection: number = 0; // Dodging direction (-1 or 1)
  private lastDodgeChange: number = 0;
  private dodgeChangeInterval: number = 2000; // Change dodge direction every 2 seconds
  private stopDistance: number = 150; // Stop moving when this close to target

  // Callbacks
  private onShootCallback?: (x: number, y: number, rotation: number) => void;

  constructor(config: BotConfig) {
    this.tankBody = config.tankBody;
    this.tankGun = config.tankGun;
    this.worldBounds = config.worldBounds;
    this.moveSpeed = config.moveSpeed || 2;
    this.rotationSpeed = config.rotationSpeed || 0.03;
    this.shootRange = config.shootRange || 600; // Increased from 300 to 600
    this.shootCooldown = config.shootCooldown || 2000; // 2 seconds
    this.dodgeDirection = Math.random() > 0.5 ? 1 : -1; // Random initial dodge direction

    // Initialize angles
    this.currentAngle = this.tankBody.rotation;
    this.currentGunAngle = this.tankGun.rotation;

    // Set initial random target
    this.setRandomTarget();
  }

  /**
   * Set bot ID for self-identification
   */
  setBotId(botId: string): void {
    this.botId = botId;
  }

  /**
   * Set a callback for when the bot wants to shoot
   */
  setOnShoot(callback: (x: number, y: number, rotation: number) => void): void {
    this.onShootCallback = callback;
  }

  /**
   * Set a random target position within world bounds
   */
  private setRandomTarget(): void {
    const margin = 50; // Keep some margin from edges
    this.targetX =
      margin +
      Math.random() *
        (this.worldBounds.maxX - this.worldBounds.minX - 2 * margin);
    this.targetY =
      margin +
      Math.random() *
        (this.worldBounds.maxY - this.worldBounds.minY - 2 * margin);

    // Calculate target angle
    const dx = this.targetX - this.tankBody.x;
    const dy = this.targetY - this.tankBody.y;
    this.targetAngle = Math.atan2(dy, dx) + Math.PI / 2; // Adjust for sprite orientation
  }

  /**
   * Find nearest target (player or bot) to fight
   */
  findNearestTarget(
    players?: Array<{ x: number; y: number; sessionId: string }>,
    bots?: Array<{ x: number; y: number; sessionId: string; botId: string }>
  ): { x: number; y: number; sessionId: string } | null {
    let nearest: { x: number; y: number; sessionId: string } | null = null;
    let minDistance = Infinity;

    // Check players
    if (players && players.length > 0) {
      for (const player of players) {
        const dx = player.x - this.tankBody.x;
        const dy = player.y - this.tankBody.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance && distance > 0) {
          minDistance = distance;
          nearest = player;
        }
      }
    }

    // Check other bots (exclude self)
    if (bots && bots.length > 0) {
      for (const bot of bots) {
        // Skip self
        if (bot.botId === this.botId) {
          continue;
        }

        const dx = bot.x - this.tankBody.x;
        const dy = bot.y - this.tankBody.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance && distance > 0) {
          minDistance = distance;
          nearest = { x: bot.x, y: bot.y, sessionId: bot.sessionId };
        }
      }
    }

    return nearest;
  }

  /**
   * Update bot AI behavior
   */
  update(
    deltaTime: number,
    players?: Array<{ x: number; y: number; sessionId: string }>,
    bots?: Array<{ x: number; y: number; sessionId: string; botId: string }>
  ): void {
    const now = Date.now();

    // Find nearest target (player or bot)
    const nearestTarget = this.findNearestTarget(players, bots);

    // Update dodge direction periodically
    if (now - this.lastDodgeChange >= this.dodgeChangeInterval) {
      this.dodgeDirection = Math.random() > 0.5 ? 1 : -1;
      this.lastDodgeChange = now;
    }

    // If target is in view, fight them
    if (nearestTarget) {
      const dx = nearestTarget.x - this.tankBody.x;
      const dy = nearestTarget.y - this.tankBody.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angleToTarget = Math.atan2(dy, dx) + Math.PI / 2;

      // Always aim gun at target when in range
      if (distance < this.shootRange) {
        this.gunTargetAngle = angleToTarget;

        // Shoot if cooldown is ready
        if (now - this.lastShotTime >= this.shootCooldown) {
          this.shoot();
        }
      } else {
        // Target out of range, aim gun at them while moving
        this.gunTargetAngle = angleToTarget;
      }

      // Movement behavior based on distance
      if (distance < this.stopDistance) {
        // Close enough - stop moving and dodge
        // Calculate perpendicular direction for dodging
        const perpendicularAngle =
          angleToTarget + (Math.PI / 2) * this.dodgeDirection;
        this.targetAngle = perpendicularAngle;
        // Move slower when dodging
        const dodgeSpeed = this.moveSpeed * 0.5;
        const moveAngle = this.currentAngle - Math.PI / 2;
        const dodgeDx = Math.cos(moveAngle) * dodgeSpeed * deltaTime;
        const dodgeDy = Math.sin(moveAngle) * dodgeSpeed * deltaTime;
        this.tankBody.x += dodgeDx;
        this.tankBody.y += dodgeDy;
      } else if (distance < this.shootRange) {
        // In shooting range but not too close - strafe/dodge while shooting
        const strafeAngle = angleToTarget + (Math.PI / 3) * this.dodgeDirection;
        this.targetAngle = strafeAngle;
      } else {
        // Out of range - move towards target
        this.targetAngle = angleToTarget;
      }
    } else {
      // No targets nearby, use random movement
      if (now - this.lastTargetChangeTime >= this.targetChangeInterval) {
        this.setRandomTarget();
        this.lastTargetChangeTime = now;
      }

      // Aim gun in movement direction
      this.gunTargetAngle = this.targetAngle;
    }

    // Rotate tank towards target
    let angleDiff = this.targetAngle - this.currentAngle;
    // Normalize angle difference to [-PI, PI]
    angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

    if (Math.abs(angleDiff) > 0.1) {
      this.currentAngle +=
        Math.sign(angleDiff) * this.rotationSpeed * deltaTime;
    } else {
      this.currentAngle = this.targetAngle;
    }

    this.tankBody.rotation = this.currentAngle;

    // Rotate gun towards target
    let gunAngleDiff = this.gunTargetAngle - this.currentGunAngle;
    gunAngleDiff = ((gunAngleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

    if (Math.abs(gunAngleDiff) > 0.1) {
      this.currentGunAngle +=
        Math.sign(gunAngleDiff) * this.rotationSpeed * deltaTime;
    } else {
      this.currentGunAngle = this.gunTargetAngle;
    }

    this.tankGun.rotation = this.currentGunAngle;

    // Move tank forward (unless we're dodging at close range, which is handled above)
    if (nearestTarget) {
      const dx = nearestTarget.x - this.tankBody.x;
      const dy = nearestTarget.y - this.tankBody.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only move if not too close (dodging is handled above)
      if (distance >= this.stopDistance) {
        const moveAngle = this.currentAngle - Math.PI / 2;
        const moveDx = Math.cos(moveAngle) * this.moveSpeed * deltaTime;
        const moveDy = Math.sin(moveAngle) * this.moveSpeed * deltaTime;
        this.tankBody.x += moveDx;
        this.tankBody.y += moveDy;
      }
    } else {
      // No target - normal movement
      const moveAngle = this.currentAngle - Math.PI / 2;
      const dx = Math.cos(moveAngle) * this.moveSpeed * deltaTime;
      const dy = Math.sin(moveAngle) * this.moveSpeed * deltaTime;
      this.tankBody.x += dx;
      this.tankBody.y += dy;
    }

    this.tankGun.x = this.tankBody.x;
    this.tankGun.y = this.tankBody.y;

    // Clamp position within world bounds
    const tankWidth = this.tankBody.width * Math.abs(this.tankBody.scale.x);
    const tankHeight = this.tankBody.height * Math.abs(this.tankBody.scale.y);
    const halfWidth = tankWidth / 2;
    const halfHeight = tankHeight / 2;

    this.tankBody.x = Math.max(
      this.worldBounds.minX + halfWidth,
      Math.min(this.worldBounds.maxX - halfWidth, this.tankBody.x)
    );
    this.tankBody.y = Math.max(
      this.worldBounds.minY + halfHeight,
      Math.min(this.worldBounds.maxY - halfHeight, this.tankBody.y)
    );
    this.tankGun.x = this.tankBody.x;
    this.tankGun.y = this.tankBody.y;

    // If reached target, set new random target
    const distToTarget = Math.sqrt(
      (this.targetX - this.tankBody.x) ** 2 +
        (this.targetY - this.tankBody.y) ** 2
    );
    if (distToTarget < 30 && !nearestTarget) {
      this.setRandomTarget();
    }
  }

  /**
   * Make the bot shoot
   */
  private shoot(): void {
    if (this.onShootCallback) {
      this.onShootCallback(
        this.tankGun.x,
        this.tankGun.y,
        this.tankGun.rotation
      );
    }
    this.lastShotTime = Date.now();
  }

  /**
   * Get bot position
   */
  getPosition(): { x: number; y: number } {
    return { x: this.tankBody.x, y: this.tankBody.y };
  }

  /**
   * Get bot rotation
   */
  getRotation(): number {
    return this.tankBody.rotation;
  }

  /**
   * Get gun rotation
   */
  getGunRotation(): number {
    return this.tankGun.rotation;
  }
}
