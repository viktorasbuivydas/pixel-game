import { Assets, Sprite, Container, Text, TextStyle, Graphics } from "pixi.js";

export interface TankConfig {
  bodyTextureUrl: string;
  gunTextureUrl: string;
  scale: number;
  initialX: number;
  initialY: number;
  username?: string;
}

export interface TankSprites {
  body: Sprite;
  gun: Sprite;
  container: Container; // Container that holds body, gun, and username label
  usernameLabel?: Text;
  healthBar?: Graphics; // Health bar graphics
  healthBarBackground?: Graphics; // Health bar background
}

export class TankFactory {
  static async create(config: TankConfig): Promise<TankSprites> {
    const {
      bodyTextureUrl,
      gunTextureUrl,
      scale,
      initialX,
      initialY,
      username,
    } = config;

    // Create container to hold all tank components
    const container = new Container();

    const tankTexture = await Assets.load(bodyTextureUrl);
    const tankSprite = new Sprite(tankTexture);
    tankSprite.scale.set(scale, scale);
    tankSprite.x = initialX;
    tankSprite.y = initialY;
    tankSprite.anchor.set(0.5);

    const tankGunTexture = await Assets.load(gunTextureUrl);
    const tankGunSprite = new Sprite(tankGunTexture);
    tankGunSprite.scale.set(scale, scale);
    tankGunSprite.anchor.set(0.5);
    tankGunSprite.x = initialX;
    tankGunSprite.y = initialY;
    tankGunSprite.rotation = 0;

    // Create username label if provided
    let usernameLabel: Text | undefined;
    let healthBar: Graphics | undefined;
    let healthBarBackground: Graphics | undefined;

    if (username) {
      const usernameStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "center",
        stroke: { color: 0x000000, width: 2 },
      });

      usernameLabel = new Text({
        text: username,
        style: usernameStyle,
      });
      usernameLabel.anchor.set(0.5);
      const usernameY = initialY - tankSprite.height * 0.5 - 15;
      usernameLabel.x = initialX;
      usernameLabel.y = usernameY;
      usernameLabel.zIndex = 100;

      // Create health bar below username
      const healthBarWidth = 60;
      const healthBarHeight = 6;
      const healthBarX = initialX - healthBarWidth / 2;
      const healthBarY = usernameY + 12; // Position below username

      // Health bar background
      healthBarBackground = new Graphics();
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

      // Health bar
      healthBar = new Graphics();
      healthBar.zIndex = 100;
      // Initialize with full health (100)
      this.updateHealthBar(
        healthBar,
        healthBarX,
        healthBarY,
        healthBarWidth,
        healthBarHeight,
        100
      );
    }

    // Add all components to container
    container.addChild(tankSprite);
    container.addChild(tankGunSprite);
    if (usernameLabel) {
      container.addChild(usernameLabel);
    }
    if (healthBarBackground) {
      container.addChild(healthBarBackground);
    }
    if (healthBar) {
      container.addChild(healthBar);
    }

    return {
      body: tankSprite,
      gun: tankGunSprite,
      container: container,
      usernameLabel: usernameLabel,
      healthBar: healthBar,
      healthBarBackground: healthBarBackground,
    };
  }

  /**
   * Update health bar graphics
   */
  static updateHealthBar(
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
  }
}
