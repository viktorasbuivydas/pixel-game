/**
 * Debug utilities for BotAI
 */
export class BotAIDebugger {
  private static enabled: boolean = false;
  private static frameCount: number = 0;
  private static logEveryNFrames: number = 60;

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
   * Log bot state
   */
  public static logBotState(
    botId: string,
    position: { x: number; y: number },
    rotation: number,
    gunRotation: number,
    behavior: string
  ): void {
    if (!this.enabled) return;
    this.frameCount++;
    if (this.frameCount % this.logEveryNFrames !== 0) return;

    console.log(`[BotAI:${botId}] State`, {
      position: `(${position.x.toFixed(2)}, ${position.y.toFixed(2)})`,
      rotation: `${(rotation * (180 / Math.PI)).toFixed(2)}°`,
      gunRotation: `${(gunRotation * (180 / Math.PI)).toFixed(2)}°`,
      behavior,
    });
  }

  /**
   * Log target found
   */
  public static logTargetFound(
    botId: string,
    target: { x: number; y: number; sessionId: string },
    distance: number
  ): void {
    if (!this.enabled) return;
    console.log(`[BotAI:${botId}] Target Found`, {
      target: target.sessionId,
      position: `(${target.x.toFixed(2)}, ${target.y.toFixed(2)})`,
      distance: distance.toFixed(2),
    });
  }

  /**
   * Log shooting
   */
  public static logShooting(
    botId: string,
    position: { x: number; y: number },
    rotation: number
  ): void {
    if (!this.enabled) return;
    console.log(`[BotAI:${botId}] Shooting`, {
      position: `(${position.x.toFixed(2)}, ${position.y.toFixed(2)})`,
      rotation: `${(rotation * (180 / Math.PI)).toFixed(2)}°`,
    });
  }

  /**
   * Log behavior change
   */
  public static logBehaviorChange(
    botId: string,
    oldBehavior: string,
    newBehavior: string
  ): void {
    if (!this.enabled) return;
    console.log(`[BotAI:${botId}] Behavior Change`, {
      from: oldBehavior,
      to: newBehavior,
    });
  }

  /**
   * Log a warning
   */
  public static warn(botId: string, message: string, data?: any): void {
    if (!this.enabled) return;
    console.warn(`[BotAI:${botId}] ${message}`, data || "");
  }

  /**
   * Log an error
   */
  public static error(botId: string, message: string, error?: Error): void {
    console.error(`[BotAI:${botId}] ${message}`, error || "");
  }
}
