import { Sprite, Application, Container, Point } from "pixi.js";
import { WorldBounds } from "../../types/WorldBounds";

/**
 * Utility functions for movement calculations
 */

// Clamp angle to (-PI, PI]
export function clampAngle(angle: number): number {
  return ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
}

// Helper function for smoothstep (ease-in, ease-out)
// Returns a value in [0,1] for t in [0,1]
export function smoothstep(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

/**
 * Movement Calculations Manager
 * Handles all physics and movement-related calculations
 */
export class PlayerMovementCalculations {
  private app: Application;
  private tankSprite: Sprite;
  private tankGunSprite: Sprite;
  private mainContainer: Container | null;
  private worldBounds: WorldBounds | null;

  // Physics parameters
  private _tankMassKg: number = 32000;
  private _tankPowerW: number = 735000;
  private _computedMaxSpeedPix: number = 0;
  private currentMaxSpeed: number = 0;
  private acceleration: number = 0;
  private deceleration: number = 0;

  constructor(
    app: Application,
    tankSprite: Sprite,
    tankGunSprite: Sprite,
    mainContainer: Container | null,
    worldBounds: WorldBounds | null,
    massKg?: number,
    powerW?: number
  ) {
    this.app = app;
    this.tankSprite = tankSprite;
    this.tankGunSprite = tankGunSprite;
    this.mainContainer = mainContainer;
    this.worldBounds = worldBounds;

    if (massKg !== undefined) this._tankMassKg = massKg;
    if (powerW !== undefined) this._tankPowerW = powerW;

    this.computeMovementParameters();
  }

  /**
   * Compute acceleration and maxSpeed in pixels/frame, taking tank mass and power into account.
   */
  private computeMovementParameters(): void {
    const pixelsPerMeter = 0.125; // 8 px = 1m

    // Top speed in m/s (rough approx): Vmax = sqrt(2*Power/Mass)
    const maxSpeedMS = Math.sqrt((2 * this._tankPowerW) / this._tankMassKg);
    // Clamp max speed for realism (MBT: 16-19 m/s)
    const clampedMaxSpeedMS = Math.min(maxSpeedMS, 19);
    this._computedMaxSpeedPix = clampedMaxSpeedMS * pixelsPerMeter;

    // Acceleration: a = F/m, F = Power / v
    const v_for_accel = 0.3 * clampedMaxSpeedMS;
    let maxAccel = this._tankPowerW / (this._tankMassKg * v_for_accel); // m/s^2
    // Typical MBT max accel ~2-5 m/s^2
    maxAccel = Math.max(2, Math.min(maxAccel, 5));
    this.acceleration = maxAccel * pixelsPerMeter;
    // Deceleration rate (brake): higher than accel for game feel
    this.deceleration = this.acceleration * 1.5;

    this.currentMaxSpeed = this._computedMaxSpeedPix;
  }

  /**
   * Calculate movement delta based on current forward value and tank angle
   */
  public calculateMovementDelta(
    currentForward: number,
    tankAngle: number,
    delta: number,
    speedMultiplier: number
  ): { dx: number; dy: number; speedThisFrame: number } {
    // Apply ease-in/ease-out by applying smoothstep to the currentForward
    const easedForward =
      Math.sign(currentForward) * smoothstep(Math.abs(currentForward));

    // Calculate how fast the tank can go
    const speedThisFrame =
      this.currentMaxSpeed * Math.abs(easedForward) * speedMultiplier;

    // Move in the direction tank is facing (forwards always in local Y negative)
    const movementAngle = tankAngle - Math.PI / 2;
    const dx =
      Math.cos(movementAngle) *
      speedThisFrame *
      delta *
      Math.sign(currentForward);
    const dy =
      Math.sin(movementAngle) *
      speedThisFrame *
      delta *
      Math.sign(currentForward);

    return { dx, dy, speedThisFrame };
  }

  /**
   * Calculate new forward value based on input direction and current state
   */
  public calculateForwardValue(
    forwardDirection: number,
    currentForward: number,
    delta: number
  ): number {
    let newForward = currentForward;

    if (forwardDirection !== 0) {
      const targetForward = forwardDirection;
      if (Math.sign(newForward) !== targetForward) {
        // Moving in opposite direction - decelerate first
        if (Math.abs(newForward) > 0.01) {
          newForward -= (this.deceleration / this.currentMaxSpeed) * delta * 2;
          if (Math.abs(newForward) < 0.01) {
            newForward = 0;
          }
        } else {
          // Start accelerating in new direction
          newForward +=
            (this.acceleration / this.currentMaxSpeed) * delta * targetForward;
          newForward = Math.max(-1, Math.min(1, newForward));
        }
      } else {
        // Accelerate in same direction
        newForward +=
          (this.acceleration / this.currentMaxSpeed) * delta * targetForward;
        newForward = Math.max(-1, Math.min(1, newForward));
      }
    } else {
      // Decelerate toward zero
      if (Math.abs(newForward) > 0) {
        const decelAmount = (this.deceleration / this.currentMaxSpeed) * delta;
        if (newForward > 0) {
          newForward -= decelAmount;
          if (newForward < 0) newForward = 0;
        } else {
          newForward += decelAmount;
          if (newForward > 0) newForward = 0;
        }
      }
    }

    return newForward;
  }

  /**
   * Calculate rotation speed based on whether tank is moving
   */
  public calculateRotationSpeed(
    baseRotationSpeed: number,
    rotationSpeedMultiplier: number,
    isMoving: boolean,
    delta: number
  ): number {
    // When moving forward/backward while rotating, rotation is slightly slower
    const rotationSpeedMultiplierForMovement = isMoving ? 0.7 : 1.0;
    return (
      baseRotationSpeed *
      rotationSpeedMultiplier *
      rotationSpeedMultiplierForMovement *
      delta
    );
  }

  /**
   * Calculate gun aim angle from mouse world position
   */
  public calculateGunAimAngle(
    mouseWorld: { x: number; y: number },
    gunWorldPos: { x: number; y: number }
  ): number {
    const dxGun = mouseWorld.x - gunWorldPos.x;
    const dyGun = mouseWorld.y - gunWorldPos.y;

    // Compute angle so "up" is forward (aligns with tank)
    // Math.atan2 gives angle where 0 points right, PixiJS rotation 0 points up
    // So we subtract Math.PI/2 to convert from atan2 to PixiJS rotation
    return Math.atan2(dyGun, dxGun) - Math.PI / 2;
  }

  /**
   * Get gun world position
   */
  public getGunWorldPosition(): { x: number; y: number } {
    // Check if gun sprite is in a container (TankEntity structure)
    if (
      this.tankGunSprite.parent &&
      this.tankGunSprite.parent !== this.app.stage
    ) {
      // Gun is in a container - get world position
      const worldTransform = this.tankGunSprite.worldTransform;
      return { x: worldTransform.tx, y: worldTransform.ty };
    } else {
      // Gun is directly on stage (legacy structure)
      return { x: this.tankGunSprite.x, y: this.tankGunSprite.y };
    }
  }

  /**
   * Calculate mouse world position from screen coordinates
   */
  public calculateMouseWorldPosition(mouseScreenPos: {
    x: number;
    y: number;
  }): { x: number; y: number } {
    // Find viewport by traversing up the sprite hierarchy
    let viewport: Container | null = null;
    let current: Container | null = this.tankGunSprite.parent as Container;

    // Traverse up the hierarchy to find the viewport (it should have a toWorld method)
    while (current && !viewport) {
      if (typeof (current as any).toWorld === "function") {
        viewport = current;
        break;
      }
      current = current.parent as Container;
    }

    if (viewport && typeof (viewport as any).toWorld === "function") {
      // Use viewport's toWorld method for accurate world coordinates
      const worldPos = (viewport as any).toWorld(
        mouseScreenPos.x,
        mouseScreenPos.y
      );
      return {
        x: worldPos?.x ?? mouseScreenPos.x,
        y: worldPos?.y ?? mouseScreenPos.y,
      };
    } else {
      // Fallback: convert screen coordinates to world coordinates using stage transform
      const canvasX = mouseScreenPos.x;
      const canvasY = mouseScreenPos.y;
      const worldPoint = this.app.stage.toLocal(new Point(canvasX, canvasY));
      return { x: worldPoint.x, y: worldPoint.y };
    }
  }

  /**
   * Clamp position within world bounds
   */
  public clampPosition(
    x: number,
    y: number,
    applyTo: Container | Sprite
  ): { clampedX: number; clampedY: number; needsClamp: boolean } {
    if (!this.worldBounds) {
      return { clampedX: x, clampedY: y, needsClamp: false };
    }

    // Account for sprite anchor (0.5, 0.5) and scaled size
    const tankWidth = this.tankSprite.width * Math.abs(this.tankSprite.scale.x);
    const tankHeight =
      this.tankSprite.height * Math.abs(this.tankSprite.scale.y);
    const halfWidth = tankWidth / 2;
    const halfHeight = tankHeight / 2;

    // Get the position in viewport local space
    let viewportSpaceX: number;
    let viewportSpaceY: number;
    let isDirectChildOfViewport = false;

    if (
      applyTo.parent &&
      typeof (applyTo.parent as any).toWorld === "function"
    ) {
      // Parent is a viewport - use local position directly
      viewportSpaceX = applyTo.x;
      viewportSpaceY = applyTo.y;
      isDirectChildOfViewport = true;
    } else {
      // Need to find the viewport parent and calculate position relative to it
      let current: any = applyTo.parent;
      let viewport: any = null;
      while (current && current !== this.app.stage) {
        if (typeof current.toWorld === "function") {
          viewport = current;
          break;
        }
        current = current.parent;
      }

      if (viewport) {
        const worldPos = new Point();
        applyTo.getGlobalPosition(worldPos, false);
        viewport.toLocal(worldPos, undefined, worldPos);
        viewportSpaceX = worldPos.x;
        viewportSpaceY = worldPos.y;
      } else {
        viewportSpaceX = applyTo.x;
        viewportSpaceY = applyTo.y;
        isDirectChildOfViewport = true;
      }
    }

    // Clamp position so all edges of tank remain *inside* world bounds
    const clampedX = Math.max(
      this.worldBounds.minX + halfWidth,
      Math.min(this.worldBounds.maxX - halfWidth, viewportSpaceX)
    );
    const clampedY = Math.max(
      this.worldBounds.minY + halfHeight,
      Math.min(this.worldBounds.maxY - halfHeight, viewportSpaceY)
    );

    const needsClamp =
      Math.abs(clampedX - viewportSpaceX) > 0.01 ||
      Math.abs(clampedY - viewportSpaceY) > 0.01;

    return { clampedX, clampedY, needsClamp };
  }

  /**
   * Apply clamped position to sprite/container
   */
  public applyClampedPosition(
    clampedX: number,
    clampedY: number,
    applyTo: Container | Sprite
  ): void {
    const currentX = applyTo.x;
    const currentY = applyTo.y;

    const dx = clampedX - currentX;
    const dy = clampedY - currentY;

    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      if (
        applyTo.parent &&
        typeof (applyTo.parent as any).toWorld === "function"
      ) {
        // Object is directly in viewport - delta is already in the correct space
        applyTo.x += dx;
        applyTo.y += dy;
      } else {
        // Object is in a container - need to convert clamped position from viewport space
        let current: any = applyTo.parent;
        let viewport: any = null;
        while (current && current !== this.app.stage) {
          if (typeof current.toWorld === "function") {
            viewport = current;
            break;
          }
          current = current.parent;
        }

        if (viewport && applyTo.parent) {
          const clampedViewportPos = new Point(clampedX, clampedY);
          const localPos = new Point();
          applyTo.parent.toLocal(clampedViewportPos, viewport, localPos);
          applyTo.x = localPos.x;
          applyTo.y = localPos.y;
        } else {
          applyTo.x += dx;
          applyTo.y += dy;
        }
      }
    }
  }

  // Getters
  public getMaxSpeed(): number {
    return this.currentMaxSpeed;
  }

  public getComputedMaxSpeedPix(): number {
    return this._computedMaxSpeedPix;
  }

  public getAcceleration(): number {
    return this.acceleration;
  }

  public getDeceleration(): number {
    return this.deceleration;
  }

  public getTankMassKg(): number {
    return this._tankMassKg;
  }

  public getTankPowerW(): number {
    return this._tankPowerW;
  }

  /**
   * Update physics parameters and recalculate
   */
  public updatePhysics(massKg?: number, powerW?: number): void {
    if (massKg !== undefined) {
      this._tankMassKg = Math.max(1000, massKg);
    }
    if (powerW !== undefined) {
      this._tankPowerW = Math.max(100000, powerW);
    }
    this.computeMovementParameters();
  }

  /**
   * Update main container reference
   */
  public setMainContainer(container: Container | null): void {
    this.mainContainer = container;
  }
}
