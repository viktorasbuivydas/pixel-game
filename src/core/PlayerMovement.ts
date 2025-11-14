import { Sprite, Application, Container, Point, Graphics } from "pixi.js";
import { WorldBounds } from "../types/WorldBounds";

/**
 * Generic event emitter for handling movement state.
 */
type Listener<T extends any[]> = (...args: T) => void;

class TypedEvent<T extends any[]> {
  private listeners: Listener<T>[] = [];
  public on(listener: Listener<T>): void {
    this.listeners.push(listener);
  }
  public off(listener: Listener<T>): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
  public emit(...args: T): void {
    for (const listener of this.listeners) {
      listener(...args);
    }
  }
}

// Improved input handling for PixiJS
class PixiInput {
  private static keys: Set<string> = new Set();

  static initialize() {
    window.addEventListener("keydown", (e) => PixiInput.keys.add(e.code));
    window.addEventListener("keyup", (e) => PixiInput.keys.delete(e.code));
  }

  static isDown(code: string) {
    return PixiInput.keys.has(code);
  }
}

PixiInput.initialize();

function lerpAngle(a: number, b: number, t: number): number {
  // Interpolates angle a -> b smoothly and prevents stutter (sprite jump) on wrapping.
  let diff = b - a;
  // Wrap to (-PI, PI]
  diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
  return a + diff * t;
}

// Clamp angle to (-PI, PI]
function clampAngle(angle: number): number {
  return ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
}

/**
 * Helper to more precisely compute world mouse position using a viewport, if parented
 */
function getMouseWorldPosition(
  app: Application,
  mouseScreenPos: { x: number; y: number },
  viewportParent?: Container
) {
  // If there's a parent, ask parent to transform screen -> world
  if (viewportParent && typeof (viewportParent as any).toWorld === "function") {
    // e.g. for pixi-viewport
    return (viewportParent as any).toWorld(mouseScreenPos.x, mouseScreenPos.y);
  }
  // Fallback, use stage transform (may be off if stage transforms are nontrivial)
  return app.stage.toLocal(new Point(mouseScreenPos.x, mouseScreenPos.y));
}

// Helper function for smoothstep (ease-in, ease-out)
// Returns a value in [0,1] for t in [0,1]
function smoothstep(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

/** Delay in ms that is required before allowing axis change between vertical/horizontal */
const AXIS_SWAP_COOLDOWN = 120; // ms, change this as needed

export class PlayerMovement {
  private tankSprite: Sprite;
  private tankGunSprite: Sprite;
  private frontArrow: Graphics; // Arrow indicator showing tank front direction
  private gunYOffset: number = 0; // Y offset for gun position relative to tank base
  private mainContainer: Container | null = null; // Cache the main container reference

  // -- Realistic tank mass (kg) and power (watts) --
  private _tankMassKg: number = 32000; // Example: 32,000 kg (T-90 MBT)
  private _tankPowerW: number = 735000; // Example: 735 kW = 1,000 hp

  /**
   * Notes:
   *  - You can set these with setTankMassKg and setTankPowerW.
   *  - Speed is computed as a function of power and mass (see below).
   *  - Internal speed/accel params are derived, NOT manually controlled.
   */

  private app: Application;
  private mouseScreenPos: { x: number; y: number } = { x: 0, y: 0 };
  private tankAngle: number = 0; // tank's facing angle (in radians)
  private targetTankAngle: number = 0; // target angle for smooth rotation
  private tankRotateSpeed: number = 0.09; // radians per frame at delta = 1
  private turretRotateSpeed: number = 0.1; // radians per frame at delta = 1
  private lastGunAngle: number = 0;
  private worldBounds: WorldBounds | null = null;

  // Debug multipliers
  private movementSpeedMultiplier: number = 1.0;
  private tankRotationSpeedMultiplier: number = 1.0;
  private gunRotationSpeedMultiplier: number = 1.0;

  private wasMovingLastFrame: boolean = false;
  private lastSpriteRotation: number = 0;

  // Movement state (for tank acceleration/deceleration)
  private currentSpeed: number = 0; // pixels per frame
  private currentForward: number = 0; // -1 to 1 (for smooth acceleration)
  private desiredForward: number = 0; // -1, 0, or 1 (set by WASD)
  private acceleration: number = 0; // pixels/frame^2 (computed from power/mass)

  // For initial friction and rolling resistance (simplified)
  private deceleration: number = 0; // pixels/frame^2

  // Event: fires when player movement state changes (true: started moving, false: stopped)
  public onMoveStateChanged = new TypedEvent<[boolean]>();
  // Event: fires when player rotates (true: started rotating, false: stopped rotating)
  public onRotateStateChanged = new TypedEvent<[boolean]>();

  private wasRotatingLastFrame: boolean = false;

  // Axis lock state NO LONGER needed as we now allow both axes at once!
  // Keep for API compat, but do not use for movement locking anymore!
  private lastMovementAxis: "horizontal" | "vertical" | null = null;
  private axisSwapTimestamp: number = 0;

  constructor(
    app: Application,
    tankSprite: Sprite,
    tankGunSprite: Sprite,
    worldBounds?: WorldBounds,
    options?: {
      tankRotateSpeed?: number;
      turretRotateSpeed?: number;
      gunYOffset?: number; // Y offset for gun position relative to tank base
      // For realism, set these (optional, will use defaults if not provided)
      massKg?: number;
      powerW?: number;
    }
  ) {
    this.app = app;
    this.tankSprite = tankSprite;
    this.tankGunSprite = tankGunSprite;
    this.lastGunAngle = tankGunSprite.rotation;
    this.worldBounds = worldBounds || null;
    this.gunYOffset = options?.gunYOffset ?? 0;
    this.setupMouseTracking();
    this.lastSpriteRotation = tankSprite.rotation;

    // Cache the main container reference if using Tank1 structure
    this.findMainContainer();

    if (options) {
      if (typeof options.tankRotateSpeed === "number") {
        this.tankRotateSpeed = options.tankRotateSpeed;
      }
      if (typeof options.turretRotateSpeed === "number") {
        this.turretRotateSpeed = options.turretRotateSpeed;
      }
      if (typeof options.massKg === "number") {
        this._tankMassKg = options.massKg;
      }
      if (typeof options.powerW === "number") {
        this._tankPowerW = options.powerW;
      }
    }

    this.computeMovementParameters();

    // Create front arrow indicator
    this.frontArrow = this.createFrontArrow();
    // Add arrow to the same parent as the tank sprite
    if (tankSprite.parent) {
      tankSprite.parent.addChild(this.frontArrow);
    } else {
      // If tank sprite doesn't have a parent yet, add it later
      // The arrow will be added when the tank is added to the viewport
    }
  }

  /**
   * Create a small arrow graphic pointing forward
   */
  private createFrontArrow(): Graphics {
    const arrow = new Graphics();

    // Draw a small triangle pointing up (forward direction in sprite space)
    // Arrow size: 8px wide, 12px tall
    const arrowWidth = 8;
    const arrowHeight = 12;

    // Draw triangle pointing up
    arrow.poly([
      0,
      -arrowHeight / 2, // Top point (front)
      -arrowWidth / 2,
      arrowHeight / 2, // Bottom left
      arrowWidth / 2,
      arrowHeight / 2, // Bottom right
    ]);

    // Fill with bright yellow for visibility
    arrow.fill(0xffff00);
    arrow.stroke({ width: 1, color: 0x000000 });

    // Set z-index to be above tank body but below gun
    arrow.zIndex = 10;

    return arrow;
  }

  /**
   * Compute acceleration and maxSpeed in pixels/frame, taking tank mass and power into account.
   * If you want to use a different pixel-to-meter ratio, adjust scaling (pixelsPerMeter).
   */
  private computeMovementParameters() {
    const pixelsPerMeter = 0.125; // 8 px = 1m, so a ~60px wide tank is ~7.5m (realistic size)

    // Power (W) = F * v
    // For max acceleration: F = Power / v

    // Let's estimate "realistic" top speed:
    // MBTs top at ~60-70 km/h (16-19 m/s); let's cap our max speed accordingly, but
    // also tie it to (Power / Mass), i.e., specific power ratio (W/kg).
    // Empirical formula (not perfect, but an adjustable base):

    // Top speed in m/s (rough approx): Vmax = sqrt(2*Power/Mass)
    const maxSpeedMS = Math.sqrt((2 * this._tankPowerW) / this._tankMassKg);
    // Clamp max speed for realism (MBT: 16-19 m/s)
    const clampedMaxSpeedMS = Math.min(maxSpeedMS, 19); // clamp to something reasonable
    this._computedMaxSpeedPix = clampedMaxSpeedMS * pixelsPerMeter;

    // Acceleration: a = F/m, F = Power / v, so a = (Power) / (m*v)
    // At low speed, F can be high, but as v increases, F drops.
    // For a game feel, we want max accel at low v: maxAccel = Power / (mass * 0.3 * Vmax)
    // Use 0.3*Vmax as "launch" velocity for more responsive tanks.
    const v_for_accel = 0.3 * clampedMaxSpeedMS;
    let maxAccel = this._tankPowerW / (this._tankMassKg * v_for_accel); // m/s^2
    // Typical MBT max accel ~2-5 m/s^2
    maxAccel = Math.max(2, Math.min(maxAccel, 5));
    this.acceleration = maxAccel * pixelsPerMeter;
    // Deceleration rate (brake): higher than accel for game feel, can adjust
    this.deceleration = this.acceleration * 1.5;

    // The currentMaxSpeed may later be affected by terrain, power loss, etc.
    this.currentMaxSpeed = this._computedMaxSpeedPix;
  }

  private _computedMaxSpeedPix: number = 0;
  private currentMaxSpeed: number = 0; // pixels/frame

  /**
   * Find and cache the main container that holds both base and gun containers
   */
  private findMainContainer(): void {
    if (
      this.tankSprite.parent &&
      this.tankSprite.parent !== this.app.stage &&
      this.tankGunSprite.parent &&
      this.tankGunSprite.parent !== this.app.stage
    ) {
      // Both sprites are in containers - check if they share the same parent
      const baseContainer = this.tankSprite.parent;
      const gunContainer = this.tankGunSprite.parent;

      if (
        baseContainer.parent &&
        baseContainer.parent === gunContainer.parent
      ) {
        // Both containers are siblings - their parent is the main container
        this.mainContainer = baseContainer.parent as Container;
      }
    }
  }

  /**
   * Track mouse position in screen coordinates
   */
  private setupMouseTracking() {
    this.app.view.addEventListener("mousemove", (event: MouseEvent) => {
      const rect = this.app.view.getBoundingClientRect();
      this.mouseScreenPos.x = event.clientX - rect.left;
      this.mouseScreenPos.y = event.clientY - rect.top;
    });
  }

  /**
   * Returns whether the player is currently moving (W/S for forward/backward).
   */
  public isMoving() {
    const wDown = PixiInput.isDown("KeyW");
    const sDown = PixiInput.isDown("KeyS");
    return wDown || sDown;
  }

  // The axis-lock logic used to prevent diagonal is now not required.
  // getCurrentPressedAxis remains for legacy API, but update() no longer uses it.

  update(delta: number) {
    // Gather intended input from keys
    const wDown = PixiInput.isDown("KeyW");
    const sDown = PixiInput.isDown("KeyS");
    const aDown = PixiInput.isDown("KeyA");
    const dDown = PixiInput.isDown("KeyD");

    // Tank-style differential steering:
    // W/S = forward/backward movement
    // A/D = left/right rotation (one track stops, tank rotates)

    // Determine forward/backward movement direction
    let forwardDirection = 0; // -1 = backward, 0 = stop, 1 = forward
    if (wDown && !sDown) {
      forwardDirection = 1; // Forward
    } else if (sDown && !wDown) {
      forwardDirection = -1; // Backward
    }

    // Determine rotation direction
    // A = rotate left (left track stops), D = rotate right (right track stops)
    let rotationDirection = 0; // -1 = rotate left, 0 = no rotation, 1 = rotate right
    if (aDown && !dDown) {
      rotationDirection = -1; // Rotate left
    } else if (dDown && !aDown) {
      rotationDirection = 1; // Rotate right
    }

    // Check if tank is moving (forward/backward) or rotating
    const moving = forwardDirection !== 0;
    const tankRotating = rotationDirection !== 0;

    // --- Emit movement state event ---
    if (moving !== this.wasMovingLastFrame) {
      this.onMoveStateChanged.emit(moving);
    }
    this.wasMovingLastFrame = moving;

    // --- Handle tank rotation (differential steering) ---
    let rotatedThisFrame = false;
    if (tankRotating) {
      // Calculate rotation speed based on whether we're also moving
      // When moving forward/backward while rotating, rotation is slightly slower (more realistic)
      const rotationSpeedMultiplier = moving ? 0.7 : 1.0;
      const rotationSpeed =
        this.tankRotateSpeed *
        this.tankRotationSpeedMultiplier *
        rotationSpeedMultiplier *
        delta;

      // Apply rotation
      this.tankAngle += rotationDirection * rotationSpeed;
      this.tankAngle = clampAngle(this.tankAngle);

      // Update sprite rotation
      if (Math.abs(this.tankSprite.rotation - this.tankAngle) > 1e-4) {
        this.tankSprite.rotation = this.tankAngle;
        rotatedThisFrame = true;
      }
    }

    // --- Handle tank forward/backward movement ---
    // Lerp the current forward value (ease in/out) for smooth accel/brake
    let dt = delta;
    if (forwardDirection !== 0) {
      // Accelerate in the desired direction
      const targetForward = forwardDirection;
      if (Math.sign(this.currentForward) !== targetForward) {
        // If we're moving in opposite direction, decelerate first, then accelerate
        if (Math.abs(this.currentForward) > 0.01) {
          this.currentForward -=
            (this.deceleration / this.currentMaxSpeed) * dt * 2; // Faster deceleration when reversing
          if (Math.abs(this.currentForward) < 0.01) {
            this.currentForward = 0;
          }
        } else {
          // Start accelerating in new direction
          this.currentForward +=
            (this.acceleration / this.currentMaxSpeed) * dt * targetForward;
          this.currentForward = Math.max(-1, Math.min(1, this.currentForward));
        }
      } else {
        // Accelerate in same direction
        this.currentForward +=
          (this.acceleration / this.currentMaxSpeed) * dt * targetForward;
        this.currentForward = Math.max(-1, Math.min(1, this.currentForward));
      }
    } else {
      // Decelerate toward zero
      if (Math.abs(this.currentForward) > 0) {
        const decelAmount = (this.deceleration / this.currentMaxSpeed) * dt;
        if (this.currentForward > 0) {
          this.currentForward -= decelAmount;
          if (this.currentForward < 0) this.currentForward = 0;
        } else {
          this.currentForward += decelAmount;
          if (this.currentForward > 0) this.currentForward = 0;
        }
      }
    }

    // Apply ease-in/ease-out by applying smoothstep to the currentForward
    const easedForward =
      Math.sign(this.currentForward) *
      smoothstep(Math.abs(this.currentForward));

    // Calculate how fast the tank can go (realistically) on screen
    const speedThisFrame =
      this.currentMaxSpeed *
      Math.abs(easedForward) *
      this.movementSpeedMultiplier;

    // Move tank base along tank facing direction (forward/backward)
    if (speedThisFrame > 0.001 && Math.abs(this.currentForward) > 0.001) {
      // Move in the direction tank is facing (forwards always in local Y negative)
      // Convert tank angle to direction vector (up in -Y axis)
      const movementAngle = this.tankAngle - Math.PI / 2;
      const dx =
        Math.cos(movementAngle) *
        speedThisFrame *
        dt *
        Math.sign(this.currentForward);
      const dy =
        Math.sin(movementAngle) *
        speedThisFrame *
        dt *
        Math.sign(this.currentForward);

      // Move the tank - use cached main container if available
      if (this.mainContainer) {
        // Tank1 structure - move main container (moves both base and gun together)
        this.mainContainer.x += dx;
        this.mainContainer.y += dy;
      } else if (
        this.tankSprite.parent &&
        this.tankSprite.parent !== this.app.stage
      ) {
        // Container structure but main container not found - move base container
        this.tankSprite.parent.x += dx;
        this.tankSprite.parent.y += dy;
      } else {
        // Legacy structure - move sprite directly
        this.tankSprite.x += dx;
        this.tankSprite.y += dy;
      }
    } else if (
      speedThisFrame > 0.001 &&
      forwardDirection === 0 &&
      Math.abs(this.currentForward) > 0.001
    ) {
      // Continue slowing down along last facing until stop
      const movementAngle = this.tankAngle - Math.PI / 2;
      const dx =
        Math.cos(movementAngle) *
        speedThisFrame *
        dt *
        Math.sign(this.currentForward);
      const dy =
        Math.sin(movementAngle) *
        speedThisFrame *
        dt *
        Math.sign(this.currentForward);

      // Move the tank - use cached main container if available
      if (this.mainContainer) {
        // Tank1 structure - move main container (moves both base and gun together)
        this.mainContainer.x += dx;
        this.mainContainer.y += dy;
      } else if (
        this.tankSprite.parent &&
        this.tankSprite.parent !== this.app.stage
      ) {
        // Container structure but main container not found - move base container
        this.tankSprite.parent.x += dx;
        this.tankSprite.parent.y += dy;
      } else {
        // Legacy structure - move sprite directly
        this.tankSprite.x += dx;
        this.tankSprite.y += dy;
      }
    }
    // Otherwise: tank is stopped (currentForward == 0), no movement

    // For gun aiming: always use precise world position of mouse (viewport aware)
    let mouseWorld: { x: number; y: number };
    const parent = this.tankGunSprite.parent as Container;
    // Try to use toWorld if we are under a pixi-viewport
    if (parent && typeof (parent as any).toWorld === "function") {
      mouseWorld = (parent as any).toWorld(
        this.mouseScreenPos.x,
        this.mouseScreenPos.y
      );
    } else {
      // Fallback: use stage transform (can have artifacts if stage is transformed)
      const tmp = this.app.stage.toLocal(
        new Point(this.mouseScreenPos.x, this.mouseScreenPos.y)
      );
      mouseWorld = { x: tmp.x, y: tmp.y };
    }

    // Get the world position of the gun sprite for aiming calculations
    // For Tank1 container structure, the gun sprite position is relative to container
    // We need to calculate the world position for mouse aiming
    let gunWorldX: number;
    let gunWorldY: number;

    // Check if gun sprite is in a container (Tank1 structure)
    if (
      this.tankGunSprite.parent &&
      this.tankGunSprite.parent !== this.app.stage
    ) {
      // Gun is in a container - get world position
      const worldTransform = this.tankGunSprite.worldTransform;
      gunWorldX = worldTransform.tx;
      gunWorldY = worldTransform.ty;
    } else {
      // Gun is directly on stage (legacy structure)
      gunWorldX = this.tankGunSprite.x;
      gunWorldY = this.tankGunSprite.y;
      // Move the gun together with the tank base, with Y offset for different tank heights
      this.tankGunSprite.x = this.tankSprite.x;
      this.tankGunSprite.y = this.tankSprite.y + this.gunYOffset;
      gunWorldX = this.tankGunSprite.x;
      gunWorldY = this.tankGunSprite.y;
    }

    // Update front arrow position and rotation
    this.updateFrontArrow();

    // Aim tank's gun directly at mouse - no smoothing, always follows mouse
    const dxGun = mouseWorld.x - gunWorldX;
    const dyGun = mouseWorld.y - gunWorldY;

    // Compute angle so "up" is forward (aligns with tank)
    // Math.atan2 gives angle where 0 points right, PixiJS rotation 0 points up
    // So we subtract Math.PI/2 to convert from atan2 to PixiJS rotation
    let desiredGunAngle = Math.atan2(dyGun, dxGun) - Math.PI / 2;

    // Directly set rotation to follow mouse - no interpolation or speed limits
    this.tankGunSprite.rotation = desiredGunAngle;
    this.lastGunAngle = desiredGunAngle;

    let gunRotatedThisFrame = true; // Always consider it rotated since we're updating it

    // Emit rotation state change if needed (true if tank OR gun rotated)
    let rotating = rotatedThisFrame || gunRotatedThisFrame;
    if (rotating !== this.wasRotatingLastFrame) {
      this.onRotateStateChanged.emit(rotating);
    }
    this.wasRotatingLastFrame = rotating;

    // Clamp player position within world bounds (make sure tank cannot leave bounds)
    // Note: World bounds are in viewport local space (since tiles are added to viewport)
    // So we need to use the tank's position relative to the viewport, not global position
    if (this.worldBounds) {
      // Account for sprite anchor (0.5, 0.5) and scaled size
      const tankWidth =
        this.tankSprite.width * Math.abs(this.tankSprite.scale.x);
      const tankHeight =
        this.tankSprite.height * Math.abs(this.tankSprite.scale.y);
      const halfWidth = tankWidth / 2;
      const halfHeight = tankHeight / 2;

      // Determine which object to move (container or sprite)
      // This should be the object that's directly inside the viewport
      let applyTo: Container | Sprite;
      if (this.mainContainer) {
        applyTo = this.mainContainer;
      } else if (
        this.tankSprite.parent &&
        this.tankSprite.parent !== this.app.stage
      ) {
        applyTo = this.tankSprite.parent;
      } else {
        applyTo = this.tankSprite;
      }

      // Get the position in viewport local space (world space for the game)
      // Since the tank is inside the viewport, we can use the local position directly
      // But we need to account for any intermediate containers
      let viewportSpaceX: number;
      let viewportSpaceY: number;
      let isDirectChildOfViewport = false;

      // If the object is directly in the viewport, use its local position
      // Otherwise, we need to calculate the position relative to the viewport
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
          // Get world position and convert to viewport local space
          const worldPos = new Point();
          applyTo.getGlobalPosition(worldPos, false);
          viewport.toLocal(worldPos, undefined, worldPos);
          viewportSpaceX = worldPos.x;
          viewportSpaceY = worldPos.y;
        } else {
          // Fallback: use local position (assumes direct child of viewport)
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

      // Calculate the difference in viewport space
      const dx = clampedX - viewportSpaceX;
      const dy = clampedY - viewportSpaceY;

      // Only adjust if we need to clamp
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        if (isDirectChildOfViewport) {
          // Object is directly in viewport - delta is already in the correct space
          applyTo.x += dx;
          applyTo.y += dy;
        } else {
          // Object is in a container - need to convert clamped position from viewport space to object's local space
          // Find the viewport again to convert from viewport space
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
            // Convert clamped position from viewport space to object's local space
            const clampedViewportPos = new Point(clampedX, clampedY);
            const localPos = new Point();
            applyTo.parent.toLocal(clampedViewportPos, viewport, localPos);
            applyTo.x = localPos.x;
            applyTo.y = localPos.y;
          } else {
            // Fallback: just add delta (shouldn't happen in normal case)
            applyTo.x += dx;
            applyTo.y += dy;
          }
        }
      }
    }
  }

  /**
   * Allows runtime adjustment of tank and turret rotation speeds.
   */
  public setTankRotateSpeed(speed: number) {
    this.tankRotateSpeed = speed;
  }
  public setTurretRotateSpeed(speed: number) {
    this.turretRotateSpeed = speed;
  }
  public getTankRotateSpeed() {
    return this.tankRotateSpeed;
  }
  public getTurretRotateSpeed() {
    return this.turretRotateSpeed;
  }

  // Debug multiplier setters
  public setMovementSpeedMultiplier(multiplier: number): void {
    this.movementSpeedMultiplier = Math.max(0.1, multiplier);
  }

  public setTankRotationSpeedMultiplier(multiplier: number): void {
    this.tankRotationSpeedMultiplier = Math.max(0.1, multiplier);
  }

  public setGunRotationSpeedMultiplier(multiplier: number): void {
    this.gunRotationSpeedMultiplier = Math.max(0.1, multiplier);
  }

  // -- Realistic mass/power setters and getters --
  public setTankMassKg(massKg: number) {
    this._tankMassKg = Math.max(1000, massKg);
    this.computeMovementParameters();
  }
  public getTankMassKg() {
    return this._tankMassKg;
  }
  public setTankPowerW(powerW: number) {
    this._tankPowerW = Math.max(100000, powerW);
    this.computeMovementParameters();
  }
  public getTankPowerW() {
    return this._tankPowerW;
  }
  public getMaxSpeedMetersPerSec() {
    return this._computedMaxSpeedPix / 8;
  }
  public getMaxSpeedPixelsPerFrame() {
    return this._computedMaxSpeedPix;
  }
  /**
   * For compatibility: allows setting old move speed (pixels per frame), but this is ignored with real physics
   */
  public setMoveSpeed(_: number) {
    /* No-op with real power/mass physics */
  }
  public getMoveSpeed() {
    return this.getMaxSpeedPixelsPerFrame();
  }

  /**
   * For compatibility: sets the tank's "mass" in pixels/frames units.
   */
  public setTankMass(mass: number) {
    // Interpret as kg if > 100, else scale up
    this._tankMassKg = mass > 100 ? mass : Math.max(mass * 1000, 1000);
    this.computeMovementParameters();
  }
  /**
   * Returns the current tank mass (in pixels units for legacy).
   */
  public getTankMass() {
    return this._tankMassKg;
  }

  /**
   * Returns the current X position of the tank (body).
   */
  public getX(): number {
    return this.tankSprite.x;
  }

  /**
   * Returns the current Y position of the tank (body).
   */
  public getY(): number {
    return this.tankSprite.y;
  }

  /**
   * Returns the current rotation of the tank (body) in radians.
   */
  public getTankRotation(): number {
    return this.tankAngle;
  }

  /**
   * Returns the current rotation of the tank's gun (turret) in radians.
   */
  public getGunRotation(): number {
    return this.tankGunSprite.rotation;
  }

  /**
   * Returns the current speed of the tank in pixels per frame.
   */
  public getCurrentSpeed(): number {
    // Calculate current speed based on currentForward and max speed
    const easedForward =
      Math.sign(this.currentForward) *
      smoothstep(Math.abs(this.currentForward));
    return (
      this.currentMaxSpeed *
      Math.abs(easedForward) *
      this.movementSpeedMultiplier
    );
  }

  /**
   * Returns the current rotation speed of the tank in radians per frame (at delta = 1).
   */
  public getCurrentRotationSpeed(): number {
    return this.tankRotateSpeed * this.tankRotationSpeedMultiplier;
  }

  /**
   * Returns the current gun rotation speed in radians per frame (at delta = 1).
   */
  public getCurrentGunRotationSpeed(): number {
    return this.turretRotateSpeed * this.gunRotationSpeedMultiplier;
  }

  /**
   * Update front arrow position and rotation to match tank
   */
  private updateFrontArrow(): void {
    if (!this.frontArrow) return;

    // Ensure arrow is added to the viewport if tank sprite has a parent
    if (this.tankSprite.parent && !this.frontArrow.parent) {
      this.tankSprite.parent.addChild(this.frontArrow);
    }

    // Calculate offset from tank center to front (along forward direction)
    // Forward direction in sprite space is -Y (up), so we offset along the tank's forward vector
    const forwardOffset = this.tankSprite.height * 0.5 + 8; // Half tank height + small offset

    // Convert tank angle to direction vector
    // Tank angle: 0 = pointing up (in sprite space, which is -Y in world)
    const movementAngle = this.tankAngle - Math.PI / 2;
    const offsetX = Math.cos(movementAngle) * forwardOffset;
    const offsetY = Math.sin(movementAngle) * forwardOffset;

    // Position arrow at front of tank
    this.frontArrow.x = this.tankSprite.x + offsetX;
    this.frontArrow.y = this.tankSprite.y + offsetY;

    // Rotate arrow to match tank rotation
    this.frontArrow.rotation = this.tankAngle;
  }
}
