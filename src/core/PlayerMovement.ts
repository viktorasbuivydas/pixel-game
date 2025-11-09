import { Sprite, Application, Container, Point } from "pixi.js";
import { WorldBounds } from "../types/WorldBounds";

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

export class PlayerMovement {
  private tankSprite: Sprite;
  private tankGunSprite: Sprite;
  private speed: number = 1;
  private app: Application;
  private mouseScreenPos: { x: number; y: number } = { x: 0, y: 0 }; // mouse position in screen coordinates
  private tankAngle: number = 0; // tank's facing angle (in radians)
  private targetTankAngle: number = 0; // target angle for smooth rotation
  private rotateSpeed: number = 0.15; // controls turn speed, radians per frame at delta=1
  private lastGunAngle: number = 0;
  private worldBounds: WorldBounds | null = null;

  constructor(
    app: Application,
    tankSprite: Sprite,
    tankGunSprite: Sprite,
    worldBounds?: WorldBounds
  ) {
    this.app = app;
    this.tankSprite = tankSprite;
    this.tankGunSprite = tankGunSprite;
    this.lastGunAngle = tankGunSprite.rotation;
    this.worldBounds = worldBounds || null;
    this.setupMouseTracking();
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

  update(delta: number) {
    let moveX = 0;
    let moveY = 0;
    // WASD movement
    if (PixiInput.isDown("KeyW")) moveY -= 1;
    if (PixiInput.isDown("KeyS")) moveY += 1;
    if (PixiInput.isDown("KeyA")) moveX -= 1;
    if (PixiInput.isDown("KeyD")) moveX += 1;

    // Only clamp them if moving, to avoid division by zero and floating-point noise
    if (moveX !== 0 || moveY !== 0) {
      const length = Math.hypot(moveX, moveY);
      moveX /= length;
      moveY /= length;

      // Target angle: upwards on sprite, so add Math.PI/2
      this.targetTankAngle = Math.atan2(moveY, moveX) + Math.PI / 2;
      this.targetTankAngle = clampAngle(this.targetTankAngle);
    }

    // Smoothly interpolate tankAngle towards targetTankAngle when moving
    // If not moving, just keep old angle
    if (moveX !== 0 || moveY !== 0) {
      const t = Math.min(1, this.rotateSpeed * delta);

      this.tankAngle = clampAngle(this.tankAngle);
      this.targetTankAngle = clampAngle(this.targetTankAngle);

      this.tankAngle = lerpAngle(this.tankAngle, this.targetTankAngle, t);
      this.tankAngle = clampAngle(this.tankAngle);

      // Only update sprite rotation if changed, for less stutter/precision noise
      if (Math.abs(this.tankSprite.rotation - this.tankAngle) > 1e-4) {
        this.tankSprite.rotation = this.tankAngle;
      }
    }

    // Move tank
    this.tankSprite.x += moveX * this.speed * delta;
    this.tankSprite.y += moveY * this.speed * delta;

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

    // Move the gun together with the tank base
    this.tankGunSprite.x = this.tankSprite.x;
    this.tankGunSprite.y = this.tankSprite.y;

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

    // Aim tank's gun at mouse (with correct parent offset)
    const dx = mouseWorld.x - this.tankGunSprite.x;
    const dy = mouseWorld.y - this.tankGunSprite.y;

    // Compute angle so "up" is forward (aligns with tank), with smooth wrap
    let desiredGunAngle = clampAngle(Math.atan2(dy, dx) + (90 * Math.PI) / 180);

    // Smooth gun movement can help, but main cause of stutter: world<->screen transform rounding errors
    // Instead: only update if angle really changed, and never snap based on tank movement
    if (Math.abs(this.tankGunSprite.rotation - desiredGunAngle) > 1e-4) {
      this.tankGunSprite.rotation = desiredGunAngle;
      this.lastGunAngle = desiredGunAngle;
    }

    // To combat stutter when moving both tank and mouse:
    // - Only update tank rotation when moving (already done above)
    // - For the gun: always compute full world position exactly, never use relative transforms, and
    //   set angle directly based on world. Avoid using parent's toLocal/child transforms as much as possible.
    // (This approach is used above: world mouse - gun pos always, never "local to parent" chain that changes on viewport move)
  }
}
