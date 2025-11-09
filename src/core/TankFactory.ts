import { Assets, Sprite } from "pixi.js";

export interface TankConfig {
  bodyTextureUrl: string;
  gunTextureUrl: string;
  scale: number;
  initialX: number;
  initialY: number;
}

export interface TankSprites {
  body: Sprite;
  gun: Sprite;
}

export class TankFactory {
  static async create(config: TankConfig): Promise<TankSprites> {
    const { bodyTextureUrl, gunTextureUrl, scale, initialX, initialY } = config;

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

    return {
      body: tankSprite,
      gun: tankGunSprite,
    };
  }
}
