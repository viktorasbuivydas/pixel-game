import { Assets, Sprite } from "pixi.js";
import { Container } from "pixi.js";
import { WorldBounds } from "../types/WorldBounds";

export interface GroundConfig {
  tilesX: number;
  tilesY: number;
  tileSize: number;
  tileScale: number;
  texture1Url: string;
  texture2Url: string;
  variantChance?: number;
}

export class GroundManager {
  private container: Container;
  private config: GroundConfig;

  constructor(container: Container, config: GroundConfig) {
    this.container = container;
    this.config = config;
  }

  async generate(): Promise<WorldBounds> {
    const {
      tilesX,
      tilesY,
      tileSize,
      tileScale,
      texture1Url,
      texture2Url,
      variantChance = 0.1,
    } = this.config;

    const groundTexture = await Assets.load(texture1Url);
    const groundTexture2 = await Assets.load(texture2Url);

    for (let i = 0; i < tilesX; i++) {
      for (let j = 0; j < tilesY; j++) {
        const tile = new Sprite(
          Math.random() > 1 - variantChance ? groundTexture : groundTexture2
        );
        tile.scale.set(tileScale, tileScale);
        tile.x = i * tileSize;
        tile.y = j * tileSize;
        this.container.addChild(tile);
      }
    }

    return {
      minX: 20,
      minY: 20,
      maxX: tilesX * tileSize,
      maxY: tilesY * tileSize,
    };
  }
}
