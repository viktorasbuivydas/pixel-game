import { Sprite, Application, Container, Point } from "pixi.js";
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
    this.setupMouseTracking();
    this.lastSpriteRotation = tankSprite.rotation;

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
   * Returns whether the player is currently moving (WASD).
   */
  public isMoving() {
    let moveX = 0,
      moveY = 0;
    if (PixiInput.isDown("KeyW")) moveY -= 1;
    if (PixiInput.isDown("KeyS")) moveY += 1;
    if (PixiInput.isDown("KeyA")) moveX -= 1;
    if (PixiInput.isDown("KeyD")) moveX += 1;
    return moveX !== 0 || moveY !== 0;
  }

  // The axis-lock logic used to prevent diagonal is now not required.
  // getCurrentPressedAxis remains for legacy API, but update() no longer uses it.

  update(delta: number) {
    let now = performance.now();

    // Gather intended input from keys
    const wDown = PixiInput.isDown("KeyW");
    const sDown = PixiInput.isDown("KeyS");
    const aDown = PixiInput.isDown("KeyA");
    const dDown = PixiInput.isDown("KeyD");

    // Determine movement along both axes: now allow pressing both
    let moveX = 0;
    let moveY = 0;

    if (wDown) moveY -= 1;
    if (sDown) moveY += 1;
    if (aDown) moveX -= 1;
    if (dDown) moveX += 1;

    // No longer restrict to a single axis – both axes can be held!

    // Compute desired direction for tank (normalized, or zero)
    let moveNormX = 0;
    let moveNormY = 0;
    let moving = false;

    if (moveX !== 0 || moveY !== 0) {
      moving = true;
      const length = Math.hypot(moveX, moveY);
      moveNormX = moveX / length;
      moveNormY = moveY / length;

      // Target angle: upwards on sprite, so add Math.PI/2
      this.targetTankAngle = Math.atan2(moveNormY, moveNormX) + Math.PI / 2;
      this.targetTankAngle = clampAngle(this.targetTankAngle);
    }

    // --- Emit movement state event instead of calling SoundManager ---
    if (moving !== this.wasMovingLastFrame) {
      this.onMoveStateChanged.emit(moving);
    }
    this.wasMovingLastFrame = moving;

    // Smoothly interpolate tankAngle towards targetTankAngle when moving
    let rotatedThisFrame = false;
    if (moveX !== 0 || moveY !== 0) {
      const t = Math.min(1, this.tankRotateSpeed * delta);
      this.tankAngle = clampAngle(this.tankAngle);
      this.targetTankAngle = clampAngle(this.targetTankAngle);

      this.tankAngle = lerpAngle(this.tankAngle, this.targetTankAngle, t);
      this.tankAngle = clampAngle(this.tankAngle);

      // Only update sprite rotation if changed, for less stutter/precision noise
      if (Math.abs(this.tankSprite.rotation - this.tankAngle) > 1e-4) {
        this.tankSprite.rotation = this.tankAngle;
        rotatedThisFrame = true;
      }
    }

    // -- Handle tank movement: ease in/ease out (acceleration/deceleration) --
    // Apply forward/backward direction only along tank facing direction
    let tankForward = 0;
    if (moveX !== 0 || moveY !== 0) {
      // Move in input direction, not just facing
      tankForward = 1;
    } else {
      // No key pressed, tank wants to slow to stop
      tankForward = 0;
    }

    // Lerp the current forward value (ease in/out) for smooth accel/brake
    let dt = delta;
    if (tankForward !== 0) {
      // Accelerate forward
      if (this.currentForward < 1) {
        this.currentForward += (this.acceleration / this.currentMaxSpeed) * dt;
        this.currentForward = Math.min(this.currentForward, 1);
      }
    } else {
      // Decelerate toward zero
      if (this.currentForward > 0) {
        this.currentForward -= (this.deceleration / this.currentMaxSpeed) * dt;
        if (this.currentForward < 0) this.currentForward = 0;
      }
    }

    // Apply ease-in/ease-out by applying smoothstep to the currentForward
    const easedForward = smoothstep(this.currentForward);

    // Calculate how fast the tank can go (realistically) on screen
    const speedThisFrame = this.currentMaxSpeed * easedForward;

    // Move tank base along tank facing (not just in input XY--real tank can't sidestep!)
    if (speedThisFrame > 0.001 && (moveX !== 0 || moveY !== 0)) {
      // Move in the direction tank is facing (forwards always in local Y negative)
      // Convert tank angle to direction vector (up in -Y axis)
      const movementAngle = this.tankAngle - Math.PI / 2;
      const dx = Math.cos(movementAngle) * speedThisFrame * dt;
      const dy = Math.sin(movementAngle) * speedThisFrame * dt;
      this.tankSprite.x += dx;
      this.tankSprite.y += dy;
    } else if (
      speedThisFrame > 0.001 &&
      moveX === 0 &&
      moveY === 0 &&
      this.currentForward > 0
    ) {
      // Continue slowing down along last facing until stop
      const movementAngle = this.tankAngle - Math.PI / 2;
      const dx = Math.cos(movementAngle) * speedThisFrame * dt;
      const dy = Math.sin(movementAngle) * speedThisFrame * dt;
      this.tankSprite.x += dx;
      this.tankSprite.y += dy;
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

    // Move the gun together with the tank base
    this.tankGunSprite.x = this.tankSprite.x;
    this.tankGunSprite.y = this.tankSprite.y;

    // Aim tank's gun at mouse (with correct parent offset)
    const dxGun = mouseWorld.x - this.tankGunSprite.x;
    const dyGun = mouseWorld.y - this.tankGunSprite.y;

    // Compute angle so "up" is forward (aligns with tank), with smooth wrap
    let desiredGunAngle = clampAngle(
      Math.atan2(dyGun, dxGun) + (90 * Math.PI) / 180
    );

    // Smoothly interpolate tankGunSprite.rotation toward desiredGunAngle using turretRotateSpeed
    let gunRotatedThisFrame = false;
    let gunCurrent = clampAngle(this.tankGunSprite.rotation);
    let gunTarget = clampAngle(desiredGunAngle);

    // Find shortest angular difference (wrap)
    let gunDiff = clampAngle(gunTarget - gunCurrent);

    if (Math.abs(gunDiff) > 1e-4) {
      // Turret rotation ratio for this frame
      let maxStep = this.turretRotateSpeed * delta;
      if (Math.abs(gunDiff) < maxStep) {
        // Snap to final
        this.tankGunSprite.rotation = gunTarget;
        this.lastGunAngle = gunTarget;
      } else {
        // Move toward target by maxStep, keeping correct sign/direction
        this.tankGunSprite.rotation = clampAngle(
          gunCurrent + maxStep * Math.sign(gunDiff)
        );
        this.lastGunAngle = this.tankGunSprite.rotation;
      }
      gunRotatedThisFrame = true;
    }

    // Emit rotation state change if needed (true if tank OR gun rotated)
    let rotating = rotatedThisFrame || gunRotatedThisFrame;
    if (rotating !== this.wasRotatingLastFrame) {
      this.onRotateStateChanged.emit(rotating);
    }
    this.wasRotatingLastFrame = rotating;

    // Clamp player position within world bounds
    if (this.worldBounds) {
      // Account for sprite anchor point (0.5, 0.5) and scaled size
      const tankWidth =
        this.tankSprite.width * Math.abs(this.tankSprite.scale.x);
      const tankHeight =
        this.tankSprite.height * Math.abs(this.tankSprite.scale.y);
      const halfWidth = tankWidth / 2;
      const halfHeight = tankHeight / 2;

      this.tankSprite.x = Math.max(
        this.worldBounds.minX + halfWidth,
        Math.min(this.worldBounds.maxX - halfWidth, this.tankSprite.x)
      );
      this.tankSprite.y = Math.max(
        this.worldBounds.minY + halfHeight,
        Math.min(this.worldBounds.maxY - halfHeight, this.tankSprite.y)
      );
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
}
