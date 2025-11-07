import { Container } from "pixi.js";

export class SceneManager {
  private static currentScene: Container;

  static changeScene(newScene: Container) {
    if (this.currentScene?.parent) {
      this.currentScene.parent.removeChild(this.currentScene);
    }
    this.currentScene = newScene;
    window.app.stage.addChild(newScene);
  }

  static get scene() {
    return this.currentScene;
  }
}
