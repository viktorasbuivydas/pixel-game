import { Sprite } from "pixi.js";
import { WorldBounds } from "../types/WorldBounds";
import { BotAICalculations } from "./botAI/BotAICalculations";
import { BotAIDecision } from "./botAI/BotAIDecision";
import { BotAIDebugger } from "./botAI/BotAIDebugger";

export interface BotConfig {
  tankBody: Sprite;
  tankGun: Sprite;
  worldBounds: WorldBounds;
  moveSpeed?: number;
  rotationSpeed?: number;
  shootRange?: number;
  shootCooldown?: number;
  debugEnabled?: boolean;
}

/**
 * BotAI - AI controller for bot tanks
 *
 * This class has been refactored into separate modules:
 * - BotAICalculations: Handles movement, rotation, and position calculations
 * - BotAIDecision: Handles AI decision logic (targeting, behavior states)
 * - BotAIDebugger: Provides debugging utilities
 */
export class BotAI {
  private tankBody: Sprite;
  private tankGun: Sprite;
  private shootCooldown: number;
  private botId: string = "";

  // AI state
  private currentAngle: number = 0;
  private currentGunAngle: number = 0;
  private lastShotTime: number = 0;
  private lastBehavior: string = "random";

  // Modules
  private calculations: BotAICalculations;
  private decision: BotAIDecision;

  // Callbacks
  private onShootCallback?: (x: number, y: number, rotation: number) => void;

  constructor(config: BotConfig) {
    this.tankBody = config.tankBody;
    this.tankGun = config.tankGun;
    this.shootCooldown = config.shootCooldown || 2000;

    const moveSpeed = config.moveSpeed || 2;
    const rotationSpeed = config.rotationSpeed || 0.03;
    const shootRange = config.shootRange || 600;
    const stopDistance = 150;
    const targetChangeInterval = 3000;
    const dodgeChangeInterval = 2000;

    // Initialize modules
    this.calculations = new BotAICalculations(
      moveSpeed,
      rotationSpeed,
      config.worldBounds
    );

    this.decision = new BotAIDecision(
      this.calculations,
      this.tankBody,
      this.botId,
      shootRange,
      stopDistance,
      targetChangeInterval,
      dodgeChangeInterval
    );

    // Initialize angles
    this.currentAngle = this.tankBody.rotation;
    this.currentGunAngle = this.tankGun.rotation;

    // Set initial random target
    this.decision.setRandomTarget();

    if (config.debugEnabled) {
      BotAIDebugger.setEnabled(true);
    }
  }

  /**
   * Set bot ID for self-identification
   */
  setBotId(botId: string): void {
    this.botId = botId;
    // Update decision module with new bot ID
    (this.decision as any).botId = botId;
  }

  /**
   * Set a callback for when the bot wants to shoot
   */
  setOnShoot(callback: (x: number, y: number, rotation: number) => void): void {
    this.onShootCallback = callback;
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

    // Find nearest target
    const nearestTarget = this.decision.findNearestTarget(players, bots);

    if (nearestTarget) {
      const distance = this.calculations.calculateDistance(
        this.tankBody.x,
        this.tankBody.y,
        nearestTarget.x,
        nearestTarget.y
      );
      BotAIDebugger.logTargetFound(this.botId, nearestTarget, distance);
    }

    // Update dodge direction
    this.decision.updateDodgeDirection(now);

    // Decide behavior
    const behavior = this.decision.decideBehavior(nearestTarget, now);

    // Log behavior change
    if (behavior.movementType !== this.lastBehavior) {
      BotAIDebugger.logBehaviorChange(
        this.botId,
        this.lastBehavior,
        behavior.movementType
      );
      this.lastBehavior = behavior.movementType;
    }

    // Rotate tank towards target
    this.currentAngle = this.calculations.rotateTowardsTarget(
      this.currentAngle,
      behavior.targetAngle,
      deltaTime
    );
    this.tankBody.rotation = this.currentAngle;

    // Rotate gun towards target
    this.currentGunAngle = this.calculations.rotateTowardsTarget(
      this.currentGunAngle,
      behavior.gunTargetAngle,
      deltaTime
    );
    this.tankGun.rotation = this.currentGunAngle;

    // Handle movement based on behavior
    const moveSpeed = this.calculations.moveSpeed;
    if (behavior.movementType === "dodge" && behavior.dodgeSpeed) {
      // Dodging - move slower
      const speed = moveSpeed * behavior.dodgeSpeed;
      const { dx, dy } = this.calculations.calculateMovementDelta(
        this.currentAngle,
        speed,
        deltaTime
      );
      this.tankBody.x += dx;
      this.tankBody.y += dy;
    } else if (nearestTarget) {
      // Moving towards or strafing around target
      const distance = this.calculations.calculateDistance(
        this.tankBody.x,
        this.tankBody.y,
        nearestTarget.x,
        nearestTarget.y
      );

      // Only move if not too close (dodging is handled above)
      if (distance >= 150) {
        const { dx, dy } = this.calculations.calculateMovementDelta(
          this.currentAngle,
          moveSpeed,
          deltaTime
        );
        this.tankBody.x += dx;
        this.tankBody.y += dy;
      }
    } else {
      // Random movement
      const { dx, dy } = this.calculations.calculateMovementDelta(
        this.currentAngle,
        moveSpeed,
        deltaTime
      );
      this.tankBody.x += dx;
      this.tankBody.y += dy;
    }

    // Update gun position to match tank
    this.tankGun.x = this.tankBody.x;
    this.tankGun.y = this.tankBody.y;

    // Clamp position within world bounds
    const tankWidth = this.tankBody.width * Math.abs(this.tankBody.scale.x);
    const tankHeight = this.tankBody.height * Math.abs(this.tankBody.scale.y);
    const clamped = this.calculations.clampPosition(
      this.tankBody.x,
      this.tankBody.y,
      tankWidth,
      tankHeight
    );
    this.tankBody.x = clamped.x;
    this.tankBody.y = clamped.y;
    this.tankGun.x = clamped.x;
    this.tankGun.y = clamped.y;

    // Check if should shoot
    if (behavior.shouldShoot && now - this.lastShotTime >= this.shootCooldown) {
      this.shoot();
    }

    // Check if reached target (for random movement)
    if (!nearestTarget && this.decision.shouldChangeTarget()) {
      this.decision.setRandomTarget();
    }

    // Debug logging
    BotAIDebugger.logBotState(
      this.botId,
      { x: this.tankBody.x, y: this.tankBody.y },
      this.currentAngle,
      this.currentGunAngle,
      behavior.movementType
    );
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
      BotAIDebugger.logShooting(
        this.botId,
        { x: this.tankGun.x, y: this.tankGun.y },
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

  /**
   * Enable/disable debug logging
   */
  public setDebugEnabled(enabled: boolean): void {
    BotAIDebugger.setEnabled(enabled);
  }
}
