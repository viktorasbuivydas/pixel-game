import { Assets, Sprite, Container, Text, TextStyle } from "pixi.js";

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
      usernameLabel.x = initialX;
      usernameLabel.y = initialY - tankSprite.height * 0.5 - 15; // Position above tank
      usernameLabel.zIndex = 100;
    }

    // Add all components to container
    container.addChild(tankSprite);
    container.addChild(tankGunSprite);
    if (usernameLabel) {
      container.addChild(usernameLabel);
    }

    return {
      body: tankSprite,
      gun: tankGunSprite,
      container: container,
      usernameLabel: usernameLabel,
    };
  }
}
