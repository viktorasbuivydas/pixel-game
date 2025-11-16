import { Sprite } from "pixi.js";
import { BotAICalculations } from "./BotAICalculations";

/**
 * Decision Manager for BotAI
 * Handles AI decision logic (targeting, behavior states)
 */
export class BotAIDecision {
  private calculations: BotAICalculations;
  private tankBody: Sprite;
  private botId: string;
  private shootRange: number;
  private stopDistance: number;
  private targetChangeInterval: number;
  private dodgeChangeInterval: number;

  // AI state
  private targetX: number = 0;
  private targetY: number = 0;
  private targetAngle: number = 0;
  private gunTargetAngle: number = 0;
  private dodgeDirection: number = 0;
  private lastTargetChangeTime: number = 0;
  private lastDodgeChange: number = 0;

  constructor(
    calculations: BotAICalculations,
    tankBody: Sprite,
    botId: string,
    shootRange: number,
    stopDistance: number,
    targetChangeInterval: number,
    dodgeChangeInterval: number
  ) {
    this.calculations = calculations;
    this.tankBody = tankBody;
    this.botId = botId;
    this.shootRange = shootRange;
    this.stopDistance = stopDistance;
    this.targetChangeInterval = targetChangeInterval;
    this.dodgeChangeInterval = dodgeChangeInterval;
    this.dodgeDirection = Math.random() > 0.5 ? 1 : -1;
  }

  /**
   * Find nearest target (player or bot)
   */
  public findNearestTarget(
    players?: Array<{ x: number; y: number; sessionId: string }>,
    bots?: Array<{ x: number; y: number; sessionId: string; botId: string }>
  ): { x: number; y: number; sessionId: string } | null {
    let nearest: { x: number; y: number; sessionId: string } | null = null;
    let minDistance = Infinity;

    // Check players
    if (players && players.length > 0) {
      for (const player of players) {
        const distance = this.calculations.calculateDistance(
          this.tankBody.x,
          this.tankBody.y,
          player.x,
          player.y
        );

        if (distance < minDistance && distance > 0) {
          minDistance = distance;
          nearest = player;
        }
      }
    }

    // Check other bots (exclude self)
    if (bots && bots.length > 0) {
      for (const bot of bots) {
        if (bot.botId === this.botId) {
          continue;
        }

        const distance = this.calculations.calculateDistance(
          this.tankBody.x,
          this.tankBody.y,
          bot.x,
          bot.y
        );

        if (distance < minDistance && distance > 0) {
          minDistance = distance;
          nearest = { x: bot.x, y: bot.y, sessionId: bot.sessionId };
        }
      }
    }

    return nearest;
  }

  /**
   * Set random target position
   */
  public setRandomTarget(): void {
    const pos = this.calculations.generateRandomPosition();
    this.targetX = pos.x;
    this.targetY = pos.y;
    this.targetAngle = this.calculations.calculateAngleToTarget(
      this.tankBody.x,
      this.tankBody.y,
      this.targetX,
      this.targetY
    );
  }

  /**
   * Update dodge direction periodically
   */
  public updateDodgeDirection(now: number): void {
    if (now - this.lastDodgeChange >= this.dodgeChangeInterval) {
      this.dodgeDirection = Math.random() > 0.5 ? 1 : -1;
      this.lastDodgeChange = now;
    }
  }

  /**
   * Decide behavior based on target
   */
  public decideBehavior(
    nearestTarget: { x: number; y: number; sessionId: string } | null,
    now: number
  ): {
    shouldShoot: boolean;
    targetAngle: number;
    gunTargetAngle: number;
    movementType: "dodge" | "strafe" | "pursue" | "random";
    dodgeSpeed?: number;
  } {
    // No target - random movement
    if (!nearestTarget) {
      if (now - this.lastTargetChangeTime >= this.targetChangeInterval) {
        this.setRandomTarget();
        this.lastTargetChangeTime = now;
      }
      this.gunTargetAngle = this.targetAngle;
      return {
        shouldShoot: false,
        targetAngle: this.targetAngle,
        gunTargetAngle: this.targetAngle,
        movementType: "random",
      };
    }

    // Calculate distance and angle to target
    const distance = this.calculations.calculateDistance(
      this.tankBody.x,
      this.tankBody.y,
      nearestTarget.x,
      nearestTarget.y
    );
    const angleToTarget = this.calculations.calculateAngleToTarget(
      this.tankBody.x,
      this.tankBody.y,
      nearestTarget.x,
      nearestTarget.y
    );

    // Always aim gun at target when in range
    if (distance < this.shootRange) {
      this.gunTargetAngle = angleToTarget;
    } else {
      this.gunTargetAngle = angleToTarget;
    }

    // Movement behavior based on distance
    if (distance < this.stopDistance) {
      // Close enough - dodge
      const perpendicularAngle =
        angleToTarget + (Math.PI / 2) * this.dodgeDirection;
      this.targetAngle = perpendicularAngle;
      return {
        shouldShoot: false,
        targetAngle: this.targetAngle,
        gunTargetAngle: this.gunTargetAngle,
        movementType: "dodge",
        dodgeSpeed: 0.5,
      };
    } else if (distance < this.shootRange) {
      // In shooting range - strafe
      const strafeAngle = angleToTarget + (Math.PI / 3) * this.dodgeDirection;
      this.targetAngle = strafeAngle;
      return {
        shouldShoot: true,
        targetAngle: this.targetAngle,
        gunTargetAngle: this.gunTargetAngle,
        movementType: "strafe",
      };
    } else {
      // Out of range - pursue
      this.targetAngle = angleToTarget;
      return {
        shouldShoot: false,
        targetAngle: this.targetAngle,
        gunTargetAngle: this.gunTargetAngle,
        movementType: "pursue",
      };
    }
  }

  /**
   * Check if should change target (reached current target)
   */
  public shouldChangeTarget(): boolean {
    const distToTarget = this.calculations.calculateDistance(
      this.tankBody.x,
      this.tankBody.y,
      this.targetX,
      this.targetY
    );
    return distToTarget < 30;
  }

  /**
   * Get current target position
   */
  public getTargetPosition(): { x: number; y: number } {
    return { x: this.targetX, y: this.targetY };
  }

  /**
   * Get target angle
   */
  public getTargetAngle(): number {
    return this.targetAngle;
  }

  /**
   * Get gun target angle
   */
  public getGunTargetAngle(): number {
    return this.gunTargetAngle;
  }
}
