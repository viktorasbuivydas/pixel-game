/**
 * Debug utilities for PlayerMovement
 * Provides logging and debugging capabilities
 */

export interface DebugInfo {
  position: { x: number; y: number };
  rotation: number;
  gunRotation: number;
  speed: number;
  rotationSpeed: number;
  gunRotationSpeed: number;
  forwardValue: number;
  isMoving: boolean;
  isRotating: boolean;
}

export class PlayerMovementDebugger {
  private static enabled: boolean = false;
  private static logInterval: number = 0;
  private static frameCount: number = 0;
  private static logEveryNFrames: number = 60; // Log every 60 frames (1 second at 60fps)

  /**
   * Enable/disable debug logging
   */
  public static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set how often to log (in frames)
   */
  public static setLogInterval(frames: number): void {
    this.logEveryNFrames = frames;
  }

  /**
   * Log debug information
   */
  public static log(info: DebugInfo, label: string = "PlayerMovement"): void {
    if (!this.enabled) return;

    this.frameCount++;
    if (this.frameCount % this.logEveryNFrames !== 0) return;

    console.log(`[${label}]`, {
      position: `(${info.position.x.toFixed(2)}, ${info.position.y.toFixed(2)})`,
      rotation: `${(info.rotation * (180 / Math.PI)).toFixed(2)}°`,
      gunRotation: `${(info.gunRotation * (180 / Math.PI)).toFixed(2)}°`,
      speed: `${info.speed.toFixed(2)} px/frame`,
      rotationSpeed: `${info.rotationSpeed.toFixed(4)} rad/frame`,
      gunRotationSpeed: `${info.gunRotationSpeed.toFixed(4)} rad/frame`,
      forwardValue: info.forwardValue.toFixed(3),
      state: {
        moving: info.isMoving,
        rotating: info.isRotating,
      },
    });
  }

  /**
   * Log a warning
   */
  public static warn(message: string, data?: any): void {
    if (!this.enabled) return;
    console.warn(`[PlayerMovement] ${message}`, data || "");
  }

  /**
   * Log an error
   */
  public static error(message: string, error?: Error): void {
    console.error(`[PlayerMovement] ${message}`, error || "");
  }

  /**
   * Log mouse position calculation
   */
  public static logMousePosition(
    screenPos: { x: number; y: number },
    worldPos: { x: number; y: number }
  ): void {
    if (!this.enabled) return;
    if (this.frameCount % this.logEveryNFrames !== 0) return;

    console.log("[PlayerMovement] Mouse Position", {
      screen: `(${screenPos.x.toFixed(2)}, ${screenPos.y.toFixed(2)})`,
      world: `(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)})`,
    });
  }

  /**
   * Log container hierarchy for debugging
   */
  public static logContainerHierarchy(
    sprite: any,
    label: string = "Sprite"
  ): void {
    if (!this.enabled) return;

    const hierarchy: string[] = [];
    let current: any = sprite;
    while (current) {
      hierarchy.push(
        `${current.constructor.name}${current.name ? `(${current.name})` : ""}`
      );
      current = current.parent;
    }

    console.log(`[PlayerMovement] ${label} Hierarchy:`, hierarchy.join(" -> "));
  }
}
