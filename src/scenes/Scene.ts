import { Container } from "pixi.js";

export abstract class Scene extends Container {
  abstract initialize(): void;
  abstract update(deltaTime: number): void;
  abstract destroy(): void;
}
