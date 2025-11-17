import { Container, Text, TextStyle, Graphics } from "pixi.js";
import { TankBaseSprites } from "./TankBaseFactory";

/**
 * UI Manager for TankEntity
 * Handles username label and health bar generation and updates
 */
export class TankEntityUI {
  /**
   * Create username label
   */
  public static createUsernameLabel(
    username: string,
    x: number,
    y: number,
    baseHeight: number
  ): Text {
    const usernameStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
      align: "center",
      stroke: { color: 0x000000, width: 2 },
    });

    const usernameLabel = new Text({
      text: username,
      style: usernameStyle,
    });
    usernameLabel.anchor.set(0.5);
    // Position relative to container (0,0) - container center is at (0,0)
    // Username should be above the tank base
    const usernameY = -baseHeight * 0.5 - 15;
    usernameLabel.x = 0; // Center of container
    usernameLabel.y = usernameY;
    usernameLabel.zIndex = 100;

    return usernameLabel;
  }

  /**
   * Create health bar background
   */
  public static createHealthBarBackground(
    x: number,
    y: number,
    usernameY: number
  ): Graphics {
    const healthBarWidth = 60;
    const healthBarHeight = 6;
    // Position relative to container (0,0)
    const healthBarX = -healthBarWidth / 2; // Center horizontally
    const healthBarY = usernameY + 12; // Below username (usernameY is already relative)

    const healthBarBackground = new Graphics();
    healthBarBackground.roundRect(
      healthBarX,
      healthBarY,
      healthBarWidth,
      healthBarHeight,
      2
    );
    healthBarBackground.fill(0x333333);
    healthBarBackground.stroke({ width: 1, color: 0x000000 });
    healthBarBackground.zIndex = 99;

    // Store position for later updates
    (healthBarBackground as any).healthBarX = healthBarX;
    (healthBarBackground as any).healthBarY = healthBarY;
    (healthBarBackground as any).healthBarWidth = healthBarWidth;
    (healthBarBackground as any).healthBarHeight = healthBarHeight;

    return healthBarBackground;
  }

  /**
   * Create health bar
   */
  public static createHealthBar(
    x: number,
    y: number,
    usernameY: number,
    initialHealth: number = 100
  ): Graphics {
    const healthBarWidth = 60;
    const healthBarHeight = 6;
    // Position relative to container (0,0)
    const healthBarX = -healthBarWidth / 2; // Center horizontally
    const healthBarY = usernameY + 12; // Below username (usernameY is already relative)

    const healthBar = new Graphics();
    healthBar.zIndex = 100;

    // Store current health for later updates
    (healthBar as any).currentHealth = initialHealth;
    // Store position for updates
    (healthBar as any).healthBarX = healthBarX;
    (healthBar as any).healthBarY = healthBarY;
    (healthBar as any).healthBarWidth = healthBarWidth;
    (healthBar as any).healthBarHeight = healthBarHeight;

    // Initialize with full health
    this.updateHealthBar(
      healthBar,
      healthBarX,
      healthBarY,
      healthBarWidth,
      healthBarHeight,
      initialHealth
    );

    return healthBar;
  }

  /**
   * Update health bar graphics
   */
  public static updateHealthBar(
    healthBar: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    health: number
  ): void {
    const maxHealth = 100;
    const healthPercent = Math.max(0, Math.min(100, health)) / maxHealth;
    const currentWidth = width * healthPercent;

    healthBar.clear();

    // Color based on health percentage
    let healthColor = 0x00ff00; // Green
    if (healthPercent < 0.3) {
      healthColor = 0xff0000; // Red
    } else if (healthPercent < 0.6) {
      healthColor = 0xffff00; // Yellow
    }

    if (currentWidth > 0) {
      healthBar.roundRect(x, y, currentWidth, height, 2);
      healthBar.fill(healthColor);
      healthBar.stroke({ width: 1, color: 0xffffff });
    }

    // Store current health
    (healthBar as any).currentHealth = health;
  }

  /**
   * Update UI element positions (relative to container)
   * Note: Since UI elements are children of the container, they move automatically
   * This method is kept for compatibility but positions are relative to container (0,0)
   */
  public static updateUIPositions(
    usernameLabel: Text | undefined,
    healthBar: Graphics | undefined,
    healthBarBackground: Graphics | undefined,
    x: number,
    y: number,
    baseHeight: number
  ): void {
    // UI elements are children of container, so they're positioned relative to container (0,0)
    // No need to update positions since container movement handles it automatically
    // Only update health bar value if needed
    if (healthBar) {
      const currentHealth = (healthBar as any).currentHealth ?? 100;
      const healthBarX = (healthBar as any).healthBarX ?? -30;
      const healthBarY = (healthBar as any).healthBarY ?? -baseHeight * 0.5 - 3;
      const healthBarWidth = (healthBar as any).healthBarWidth ?? 60;
      const healthBarHeight = (healthBar as any).healthBarHeight ?? 6;

      this.updateHealthBar(
        healthBar,
        healthBarX,
        healthBarY,
        healthBarWidth,
        healthBarHeight,
        currentHealth
      );
    }
  }
}
