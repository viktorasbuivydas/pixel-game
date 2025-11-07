import { Container, Graphics } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MenuScene } from "./MenuScene";
import { MainSceneUi } from "./ui/MainSceneUi";

export class MainScene extends Scene {
  private gameContainer: Container;
  private ui: MainSceneUi;
  private score: number = 0;
  private level: number = 1;

  initialize(): void {
    const app = window.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Create UI
    this.ui = new MainSceneUi(screenWidth, screenHeight);
    this.ui.setScore(this.score);
    this.ui.setLevel(this.level);

    // Handle "MENU" button
    this.ui.onBack(() => {
      const menuScene = new MenuScene();
      menuScene.initialize();
      SceneManager.changeScene(menuScene);
    });

    // Create game container for game elements
    this.gameContainer = new Container();

    // Create a simple game element (placeholder)
    const gameElement = new Graphics();
    gameElement.circle(0, 0, 30);
    gameElement.fill(0x00ff00);
    gameElement.x = screenWidth / 2;
    gameElement.y = screenHeight / 2;
    this.gameContainer.addChild(gameElement);

    // Add everything to scene
    this.addChild(this.ui);
    this.addChild(this.gameContainer);

    // Increment score over time
    window.app.ticker.add(this.updateScore, this);
  }

  private updateScore = (): void => {
    this.score += 0.1;
    this.ui.setScore(this.score);
  };

  update(deltaTime: number): void {
    // Update game logic here
    // For example, move game elements, check collisions, etc.
  }

  destroy(): void {
    window.app.ticker.remove(this.updateScore, this);
    this.ui.destroy();
    this.removeChildren();
  }
}
