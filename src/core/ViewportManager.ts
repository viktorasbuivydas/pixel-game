import { Application } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { WorldBounds } from "../types/WorldBounds";

export interface ViewportConfig {
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  bounds?: WorldBounds;
}

export class ViewportManager {
  static create(app: Application, config: ViewportConfig): Viewport {
    const viewport = new Viewport({
      screenHeight: config.screenHeight,
      screenWidth: config.screenWidth,
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
      events: app.renderer.events,
    });

    // Disable zoom by not calling clampZoom, wheel, or pinch

    if (config.bounds) {
      viewport.clamp({
        left: config.bounds.minX,
        top: config.bounds.minY,
        right: config.bounds.maxX,
        bottom: config.bounds.maxY,
        direction: "all",
      });
    }

    return viewport;
  }
}
