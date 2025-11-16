/**
 * Input Manager for PlayerMovement
 * Handles keyboard input processing
 */

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

export interface MovementInput {
  forwardDirection: number; // -1 = backward, 0 = stop, 1 = forward
  rotationDirection: number; // -1 = rotate left, 0 = no rotation, 1 = rotate right
  isMoving: boolean;
  isRotating: boolean;
}

/**
 * Input processor for player movement
 */
export class PlayerMovementInput {
  /**
   * Process keyboard input and return movement state
   */
  public static processInput(): MovementInput {
    const wDown = PixiInput.isDown("KeyW");
    const sDown = PixiInput.isDown("KeyS");
    const aDown = PixiInput.isDown("KeyA");
    const dDown = PixiInput.isDown("KeyD");

    // Determine forward/backward movement direction
    let forwardDirection = 0;
    if (wDown && !sDown) {
      forwardDirection = 1; // Forward
    } else if (sDown && !wDown) {
      forwardDirection = -1; // Backward
    }

    // Determine rotation direction
    let rotationDirection = 0;
    if (aDown && !dDown) {
      rotationDirection = -1; // Rotate left
    } else if (dDown && !aDown) {
      rotationDirection = 1; // Rotate right
    }

    const isMoving = forwardDirection !== 0;
    const isRotating = rotationDirection !== 0;

    return {
      forwardDirection,
      rotationDirection,
      isMoving,
      isRotating,
    };
  }

  /**
   * Returns whether the player is currently moving (W/S for forward/backward).
   */
  public static isMoving(): boolean {
    const wDown = PixiInput.isDown("KeyW");
    const sDown = PixiInput.isDown("KeyS");
    return wDown || sDown;
  }
}
