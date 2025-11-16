import { Sprite, Application, Container } from "pixi.js";
import { WorldBounds } from "../types/WorldBounds";
import { PlayerMovementUI } from "./playerMovement/PlayerMovementUI";
import {
  PlayerMovementCalculations,
  clampAngle,
} from "./playerMovement/PlayerMovementCalculations";
import {
  PlayerMovementInput,
  MovementInput,
} from "./playerMovement/PlayerMovementInput";
import {
  PlayerMovementDebugger,
  DebugInfo,
} from "./playerMovement/PlayerMovementDebugger";

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

/**
 * PlayerMovement - Main class for handling player tank movement and controls
 *
 * This class has been refactored into separate modules:
 * - PlayerMovementUI: Handles visual UI elements (front arrow)
 * - PlayerMovementCalculations: Handles all physics and movement calculations
 * - PlayerMovementInput: Handles keyboard input processing
 * - PlayerMovementDebugger: Provides debugging utilities
 */
export class PlayerMovement {
  // Core sprites and containers
  private tankSprite: Sprite;
  private tankGunSprite: Sprite;
  private mainContainer: Container | null = null;

  // Application and world
  private app: Application;
  private worldBounds: WorldBounds | null = null;
  private mouseScreenPos: { x: number; y: number } = { x: 0, y: 0 };

  // Movement state
  private tankAngle: number = 0;
  private currentForward: number = 0; // -1 to 1 (for smooth acceleration)
  private wasMovingLastFrame: boolean = false;
  private wasRotatingLastFrame: boolean = false;

  // Rotation speeds
  private tankRotateSpeed: number = 0.09; // radians per frame at delta = 1
  private turretRotateSpeed: number = 0.1; // radians per frame at delta = 1

  // Debug multipliers
  private movementSpeedMultiplier: number = 1.0;
  private tankRotationSpeedMultiplier: number = 1.0;
  private gunRotationSpeedMultiplier: number = 1.0;

  // Modules
  private ui: PlayerMovementUI;
  private calculations: PlayerMovementCalculations;

  // Events
  public onMoveStateChanged = new TypedEvent<[boolean]>();
  public onRotateStateChanged = new TypedEvent<[boolean]>();

  constructor(
    app: Application,
    tankSprite: Sprite,
    tankGunSprite: Sprite,
    worldBounds?: WorldBounds,
    options?: {
      tankRotateSpeed?: number;
      turretRotateSpeed?: number;
      gunYOffset?: number;
      massKg?: number;
      powerW?: number;
      debugEnabled?: boolean;
    }
  ) {
    this.app = app;
    this.tankSprite = tankSprite;
    this.tankGunSprite = tankGunSprite;
    this.worldBounds = worldBounds || null;
    this.tankAngle = tankSprite.rotation;

    // Setup mouse tracking
    this.setupMouseTracking();

    // Cache the main container reference if using TankEntity structure
    this.findMainContainer();

    // Initialize modules
    this.ui = new PlayerMovementUI(tankSprite);
    this.calculations = new PlayerMovementCalculations(
      app,
      tankSprite,
      tankGunSprite,
      this.mainContainer,
      worldBounds || null,
      options?.massKg,
      options?.powerW
    );

    // Apply options
    if (options) {
      if (typeof options.tankRotateSpeed === "number") {
        this.tankRotateSpeed = options.tankRotateSpeed;
      }
      if (typeof options.turretRotateSpeed === "number") {
        this.turretRotateSpeed = options.turretRotateSpeed;
      }
      if (options.debugEnabled) {
        PlayerMovementDebugger.setEnabled(true);
      }
    }

    // Add front arrow to parent if available
    if (tankSprite.parent) {
      tankSprite.parent.addChild(this.ui.getFrontArrow());
    }
  }

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
      const baseContainer = this.tankSprite.parent;
      const gunContainer = this.tankGunSprite.parent;

      if (
        baseContainer.parent &&
        baseContainer.parent === gunContainer.parent
      ) {
        this.mainContainer = baseContainer.parent as Container;
        this.calculations?.setMainContainer(this.mainContainer);
      }
    }
  }

  /**
   * Track mouse position in screen coordinates
   */
  private setupMouseTracking() {
    // Use canvas element directly (app.view should be the canvas)
    const canvas = this.app.canvas || this.app.view;

    if (!canvas) {
      console.warn("[PlayerMovement] Canvas not available for mouse tracking");
      return;
    }

    const updateMousePosition = (event: MouseEvent) => {
      try {
        const rect = canvas.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          this.mouseScreenPos.x = event.clientX - rect.left;
          this.mouseScreenPos.y = event.clientY - rect.top;
        }
      } catch (error) {
        console.warn("[PlayerMovement] Error updating mouse position:", error);
      }
    };

    // Track mouse move (primary event)
    canvas.addEventListener("mousemove", updateMousePosition, {
      passive: true,
    });

    // Also track mouse position on mouseenter to initialize position
    canvas.addEventListener("mouseenter", updateMousePosition, {
      passive: true,
    });

    // Track mouse position even when mouse is over the canvas (for initial position)
    canvas.addEventListener("mouseover", updateMousePosition, {
      passive: true,
    });

    // Fallback: Update mouse position on any mouse event
    canvas.addEventListener("mousedown", updateMousePosition, {
      passive: true,
    });
    canvas.addEventListener("mouseup", updateMousePosition, { passive: true });

    // Also track on the window as a fallback (in case canvas events don't fire)
    const windowMouseMove = (event: MouseEvent) => {
      // Only update if mouse is over the canvas
      const rect = canvas.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        this.mouseScreenPos.x = event.clientX - rect.left;
        this.mouseScreenPos.y = event.clientY - rect.top;
      }
    };

    // Use window mousemove as a fallback (with throttling to avoid performance issues)
    let lastWindowUpdate = 0;
    window.addEventListener(
      "mousemove",
      (event: MouseEvent) => {
        const now = Date.now();
        if (now - lastWindowUpdate > 16) {
          // Throttle to ~60fps
          windowMouseMove(event);
          lastWindowUpdate = now;
        }
      },
      { passive: true }
    );
  }

  /**
   * Main update loop
   */
  update(delta: number) {
    // Process input
    const input = PlayerMovementInput.processInput();

    // Emit movement state event
    if (input.isMoving !== this.wasMovingLastFrame) {
      this.onMoveStateChanged.emit(input.isMoving);
    }
    this.wasMovingLastFrame = input.isMoving;

    // Handle tank rotation
    let rotatedThisFrame = false;
    if (input.isRotating) {
      const rotationSpeed = this.calculations.calculateRotationSpeed(
        this.tankRotateSpeed,
        this.tankRotationSpeedMultiplier,
        input.isMoving,
        delta
      );

      this.tankAngle += input.rotationDirection * rotationSpeed;
      this.tankAngle = clampAngle(this.tankAngle);

      if (Math.abs(this.tankSprite.rotation - this.tankAngle) > 1e-4) {
        this.tankSprite.rotation = this.tankAngle;
        rotatedThisFrame = true;
      }
    }

    // Handle forward/backward movement
    this.currentForward = this.calculations.calculateForwardValue(
      input.forwardDirection,
      this.currentForward,
      delta
    );

    // Calculate and apply movement
    const { dx, dy, speedThisFrame } = this.calculations.calculateMovementDelta(
      this.currentForward,
      this.tankAngle,
      delta,
      this.movementSpeedMultiplier
    );

    // Apply movement if moving
    if (speedThisFrame > 0.001 && Math.abs(this.currentForward) > 0.001) {
      this.applyMovement(dx, dy);
    }

    // Handle gun aiming
    this.updateGunAiming();

    // Update UI
    this.ui.updateFrontArrow(this.tankAngle);

    // Emit rotation state change
    const gunRotatedThisFrame = true; // Gun always follows mouse
    const rotating = rotatedThisFrame || gunRotatedThisFrame;
    if (rotating !== this.wasRotatingLastFrame) {
      this.onRotateStateChanged.emit(rotating);
    }
    this.wasRotatingLastFrame = rotating;

    // Clamp position within world bounds
    this.clampPositionToBounds();

    // Debug logging
    this.logDebugInfo(input);
  }

  /**
   * Apply movement to tank container/sprite
   */
  private applyMovement(dx: number, dy: number): void {
    if (this.mainContainer) {
      // TankEntity structure - move main container (moves both base and gun together)
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

  /**
   * Update gun aiming based on mouse position
   */
  private updateGunAiming(): void {
    // Calculate mouse world position
    const mouseWorld = this.calculations.calculateMouseWorldPosition(
      this.mouseScreenPos
    );

    // Get gun world position
    const gunWorldPos = this.calculations.getGunWorldPosition();

    // Calculate aim angle
    const desiredGunAngle = this.calculations.calculateGunAimAngle(
      mouseWorld,
      gunWorldPos
    );

    // Apply rotation
    this.tankGunSprite.rotation = desiredGunAngle;

    // Debug mouse position
    PlayerMovementDebugger.logMousePosition(this.mouseScreenPos, mouseWorld);
  }

  /**
   * Clamp position within world bounds
   */
  private clampPositionToBounds(): void {
    if (!this.worldBounds) return;

    // Determine which object to clamp
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

    // Get current position
    const currentX = applyTo.x;
    const currentY = applyTo.y;

    // Calculate clamped position
    const { clampedX, clampedY, needsClamp } = this.calculations.clampPosition(
      currentX,
      currentY,
      applyTo
    );

    // Apply clamped position if needed
    if (needsClamp) {
      this.calculations.applyClampedPosition(clampedX, clampedY, applyTo);
    }
  }

  /**
   * Log debug information
   */
  private logDebugInfo(input: MovementInput): void {
    const debugInfo: DebugInfo = {
      position: { x: this.getX(), y: this.getY() },
      rotation: this.tankAngle,
      gunRotation: this.tankGunSprite.rotation,
      speed: this.getCurrentSpeed(),
      rotationSpeed: this.getCurrentRotationSpeed(),
      gunRotationSpeed: this.getCurrentGunRotationSpeed(),
      forwardValue: this.currentForward,
      isMoving: input.isMoving,
      isRotating: input.isRotating,
    };

    PlayerMovementDebugger.log(debugInfo);
  }

  // ========== Public API ==========

  /**
   * Returns whether the player is currently moving (W/S for forward/backward).
   */
  public isMoving() {
    return PlayerMovementInput.isMoving();
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

  // Realistic mass/power setters and getters
  public setTankMassKg(massKg: number) {
    this.calculations.updatePhysics(massKg, undefined);
  }

  public getTankMassKg() {
    return this.calculations.getTankMassKg();
  }

  public setTankPowerW(powerW: number) {
    this.calculations.updatePhysics(undefined, powerW);
  }

  public getTankPowerW() {
    return this.calculations.getTankPowerW();
  }

  public getMaxSpeedMetersPerSec() {
    return this.calculations.getComputedMaxSpeedPix() / 8;
  }

  public getMaxSpeedPixelsPerFrame() {
    return this.calculations.getComputedMaxSpeedPix();
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
    const massKg = mass > 100 ? mass : Math.max(mass * 1000, 1000);
    this.calculations.updatePhysics(massKg, undefined);
  }

  /**
   * Returns the current tank mass (in pixels units for legacy).
   */
  public getTankMass() {
    return this.calculations.getTankMassKg();
  }

  /**
   * Returns the current X position of the tank (body).
   * For TankEntity structure, returns the main container's world position.
   */
  public getX(): number {
    if (this.mainContainer) {
      return this.mainContainer.x;
    } else if (
      this.tankSprite.parent &&
      this.tankSprite.parent !== this.app.stage
    ) {
      return this.tankSprite.parent.x;
    } else {
      return this.tankSprite.x;
    }
  }

  /**
   * Returns the current Y position of the tank (body).
   * For TankEntity structure, returns the main container's world position.
   */
  public getY(): number {
    if (this.mainContainer) {
      return this.mainContainer.y;
    } else if (
      this.tankSprite.parent &&
      this.tankSprite.parent !== this.app.stage
    ) {
      return this.tankSprite.parent.y;
    } else {
      return this.tankSprite.y;
    }
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
    const { speedThisFrame } = this.calculations.calculateMovementDelta(
      this.currentForward,
      this.tankAngle,
      1.0, // delta = 1 for current speed calculation
      this.movementSpeedMultiplier
    );
    return speedThisFrame;
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
   * Enable/disable debug logging
   */
  public setDebugEnabled(enabled: boolean): void {
    PlayerMovementDebugger.setEnabled(enabled);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.ui.destroy();
  }
}
