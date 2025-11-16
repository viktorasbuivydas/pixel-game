import { WorldBounds } from "../../types/WorldBounds";

/**
 * Calculations Manager for BotAI
 * Handles movement, rotation, and position calculations
 */
export class BotAICalculations {
  public moveSpeed: number;
  private rotationSpeed: number;
  private worldBounds: WorldBounds;

  constructor(
    moveSpeed: number,
    rotationSpeed: number,
    worldBounds: WorldBounds
  ) {
    this.moveSpeed = moveSpeed;
    this.rotationSpeed = rotationSpeed;
    this.worldBounds = worldBounds;
  }

  /**
   * Calculate distance between two points
   */
  public calculateDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate angle to target
   */
  public calculateAngleToTarget(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): number {
    const dx = toX - fromX;
    const dy = toY - fromY;
    return Math.atan2(dy, dx) + Math.PI / 2; // Adjust for sprite orientation
  }

  /**
   * Normalize angle difference to [-PI, PI]
   */
  public normalizeAngleDiff(angleDiff: number): number {
    return ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
  }

  /**
   * Calculate movement delta based on angle and speed
   */
  public calculateMovementDelta(
    angle: number,
    speed: number,
    deltaTime: number
  ): { dx: number; dy: number } {
    const moveAngle = angle - Math.PI / 2;
    const dx = Math.cos(moveAngle) * speed * deltaTime;
    const dy = Math.sin(moveAngle) * speed * deltaTime;
    return { dx, dy };
  }

  /**
   * Rotate towards target angle
   */
  public rotateTowardsTarget(
    currentAngle: number,
    targetAngle: number,
    deltaTime: number
  ): number {
    let angleDiff = this.normalizeAngleDiff(targetAngle - currentAngle);

    if (Math.abs(angleDiff) > 0.1) {
      return (
        currentAngle + Math.sign(angleDiff) * this.rotationSpeed * deltaTime
      );
    } else {
      return targetAngle;
    }
  }

  /**
   * Clamp position within world bounds
   */
  public clampPosition(
    x: number,
    y: number,
    tankWidth: number,
    tankHeight: number
  ): { x: number; y: number } {
    const halfWidth = tankWidth / 2;
    const halfHeight = tankHeight / 2;

    const clampedX = Math.max(
      this.worldBounds.minX + halfWidth,
      Math.min(this.worldBounds.maxX - halfWidth, x)
    );
    const clampedY = Math.max(
      this.worldBounds.minY + halfHeight,
      Math.min(this.worldBounds.maxY - halfHeight, y)
    );

    return { x: clampedX, y: clampedY };
  }

  /**
   * Generate random position within world bounds
   */
  public generateRandomPosition(margin: number = 50): { x: number; y: number } {
    return {
      x:
        margin +
        Math.random() *
          (this.worldBounds.maxX - this.worldBounds.minX - 2 * margin),
      y:
        margin +
        Math.random() *
          (this.worldBounds.maxY - this.worldBounds.minY - 2 * margin),
    };
  }

  /**
   * Update move speed
   */
  public setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  /**
   * Update rotation speed
   */
  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }
}
