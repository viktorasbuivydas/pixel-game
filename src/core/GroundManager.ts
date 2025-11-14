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

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < tilesX; i++) {
      for (let j = 0; j < tilesY; j++) {
        const tile = new Sprite(
          Math.random() > 1 - variantChance ? groundTexture : groundTexture2
        );
        tile.scale.set(tileScale, tileScale);
        tile.x = i * tileSize;
        tile.y = j * tileSize;
        this.container.addChild(tile);

        // Update bounds based on the scaled tile positions and sizes
        const tileWidth = tile.width;
        const tileHeight = tile.height;
        const tileMinX = tile.x;
        const tileMinY = tile.y;
        const tileMaxX = tile.x + tileWidth;
        const tileMaxY = tile.y + tileHeight;

        if (tileMinX < minX) minX = tileMinX;
        if (tileMinY < minY) minY = tileMinY;
        if (tileMaxX > maxX) maxX = tileMaxX;
        if (tileMaxY > maxY) maxY = tileMaxY;
      }
    }

    // Defensive fallback if loop did not run
    if (minX === Number.POSITIVE_INFINITY) minX = 0;
    if (minY === Number.POSITIVE_INFINITY) minY = 0;
    if (maxX === Number.NEGATIVE_INFINITY) maxX = tilesX * tileSize * tileScale;
    if (maxY === Number.NEGATIVE_INFINITY) maxY = tilesY * tileSize * tileScale;

    return {
      minX,
      minY,
      maxX,
      maxY,
    };
  }
}
