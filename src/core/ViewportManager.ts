import { Application } from "pixi.js";
import { Viewport } from "pixi-viewport";

export interface ViewportConfig {
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
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

    viewport.drag().pinch().wheel().decelerate();

    return viewport;
  }
}
