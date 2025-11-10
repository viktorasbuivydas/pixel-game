import { Container, Graphics, Sprite, Viewport } from "pixi.js";
import { WorldBounds } from "../../types/WorldBounds";

export interface MinimapConfig {
  width: number;
  height: number;
  x: number;
  y: number;
  worldBounds: WorldBounds;
  backgroundColor?: number;
  borderColor?: number;
  playerColor?: number;
  viewportColor?: number;
}

export class Minimap extends Container {
  private config: MinimapConfig;
  private background: Graphics;
  private border: Graphics;
  private playerMarker: Graphics;
  private viewportIndicator: Graphics;
  private viewport: Viewport;
  private playerSprite: Sprite | undefined;
  private scaleX: number;
  private scaleY: number;

  constructor(viewport: Viewport, config: MinimapConfig) {
    super();
    this.viewport = viewport;
    this.config = {
      backgroundColor: 0x1a1a1a,
      borderColor: 0xffffff,
      playerColor: 0x00ff00,
      viewportColor: 0xffff00,
      ...config,
    };

    this.scaleX =
      this.config.width /
      (this.config.worldBounds.maxX - this.config.worldBounds.minX);
    this.scaleY =
      this.config.height /
      (this.config.worldBounds.maxY - this.config.worldBounds.minY);

    this.x = this.config.x;
    this.y = this.config.y;

    this.createMinimap();
  }

  private createMinimap(): void {
    // Background
    this.background = new Graphics();
    this.background.roundRect(0, 0, this.config.width, this.config.height, 4);
    this.background.fill(this.config.backgroundColor!);
    this.addChild(this.background);

    // Border
    this.border = new Graphics();
    this.border.roundRect(0, 0, this.config.width, this.config.height, 4);
    this.border.stroke({ width: 2, color: this.config.borderColor! });
    this.addChild(this.border);

    // Viewport indicator (shows what area is currently visible)
    this.viewportIndicator = new Graphics();
    this.viewportIndicator.stroke({
      width: 1,
      color: this.config.viewportColor!,
    });
    this.addChild(this.viewportIndicator);

    // Player marker
    this.playerMarker = new Graphics();
    this.playerMarker.circle(0, 0, 3);
    this.playerMarker.fill(this.config.playerColor!);
    this.addChild(this.playerMarker);
  }

  setPlayerSprite(sprite: Sprite): void {
    this.playerSprite = sprite;
  }

  update(): void {
    if (!this.playerSprite) return;

    // Update player position
    const playerX =
      (this.playerSprite.x - this.config.worldBounds.minX) * this.scaleX;
    const playerY =
      (this.playerSprite.y - this.config.worldBounds.minY) * this.scaleY;
    this.playerMarker.x = Math.max(0, Math.min(this.config.width, playerX));
    this.playerMarker.y = Math.max(0, Math.min(this.config.height, playerY));

    // Get viewport visible bounds in world coordinates
    const viewportWorldLeft = this.viewport.left;
    const viewportWorldTop = this.viewport.top;
    const viewportWorldRight = this.viewport.right;
    const viewportWorldBottom = this.viewport.bottom;

    // Convert to minimap coordinates
    const viewportMinimapX =
      (viewportWorldLeft - this.config.worldBounds.minX) * this.scaleX;
    const viewportMinimapY =
      (viewportWorldTop - this.config.worldBounds.minY) * this.scaleY;
    const viewportMinimapWidth =
      (viewportWorldRight - viewportWorldLeft) * this.scaleX;
    const viewportMinimapHeight =
      (viewportWorldBottom - viewportWorldTop) * this.scaleY;

    // Clamp viewport indicator to minimap bounds
    const clampedX = Math.max(0, Math.min(this.config.width, viewportMinimapX));
    const clampedY = Math.max(
      0,
      Math.min(this.config.height, viewportMinimapY)
    );
    const clampedWidth = Math.min(
      this.config.width - clampedX,
      viewportMinimapWidth
    );
    const clampedHeight = Math.min(
      this.config.height - clampedY,
      viewportMinimapHeight
    );

    this.viewportIndicator.clear();
    if (clampedWidth > 0 && clampedHeight > 0) {
      this.viewportIndicator.roundRect(
        clampedX,
        clampedY,
        clampedWidth,
        clampedHeight,
        1
      );
      this.viewportIndicator.stroke({
        width: 1,
        color: this.config.viewportColor!,
      });
    }
  }

  destroy(options?: any): void {
    this.removeChildren();
    super.destroy(options);
  }
}
