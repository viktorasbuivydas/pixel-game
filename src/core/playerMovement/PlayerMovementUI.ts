import { Graphics, Sprite } from "pixi.js";

/**
 * UI Manager for PlayerMovement
 * Handles all visual UI elements like front arrow indicator
 */
export class PlayerMovementUI {
  private frontArrow: Graphics;
  private tankSprite: Sprite;

  constructor(tankSprite: Sprite) {
    this.tankSprite = tankSprite;
    this.frontArrow = this.createFrontArrow();
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
   * Get the front arrow graphics object
   */
  public getFrontArrow(): Graphics {
    return this.frontArrow;
  }

  /**
   * Update front arrow position and rotation to match tank
   */
  public updateFrontArrow(tankAngle: number): void {
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
    const movementAngle = tankAngle - Math.PI / 2;
    const offsetX = Math.cos(movementAngle) * forwardOffset;
    const offsetY = Math.sin(movementAngle) * forwardOffset;

    // Position arrow at front of tank
    this.frontArrow.x = this.tankSprite.x + offsetX;
    this.frontArrow.y = this.tankSprite.y + offsetY;

    // Rotate arrow to match tank rotation
    this.frontArrow.rotation = tankAngle;
  }

  /**
   * Clean up UI resources
   */
  public destroy(): void {
    if (this.frontArrow && this.frontArrow.parent) {
      this.frontArrow.parent.removeChild(this.frontArrow);
    }
    this.frontArrow.destroy();
  }
}
