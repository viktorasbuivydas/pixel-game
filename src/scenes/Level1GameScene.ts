import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MenuScene } from "./MenuScene";

export class Level1GameScene extends Scene {
  private gameContainer: Container;
  private scoreText: Text;
  private score: number = 0;
  private backButton: Graphics;
  private backButtonText: Text;
  private buttonContainer: Container;

  initialize(): void {
    const app = window.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Create game container for game elements
    this.gameContainer = new Container();

    // Create score display
    const scoreStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 32,
      fill: 0xffffff,
      align: "left",
    });

    this.scoreText = new Text({
      text: `Score: ${this.score}`,
      style: scoreStyle,
    });
    this.scoreText.x = 20;
    this.scoreText.y = 20;

    // Create level label
    const levelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 28,
      fill: 0xffff00,
      align: "center",
    });

    const levelText = new Text({
      text: "LEVEL 1",
      style: levelStyle,
    });
    levelText.anchor.set(0.5);
    levelText.x = screenWidth / 2;
    levelText.y = 50;

    // Create back button
    this.buttonContainer = new Container();
    this.buttonContainer.x = 100;
    this.buttonContainer.y = screenHeight - 50;
    this.buttonContainer.eventMode = "static";
    this.buttonContainer.cursor = "pointer";

    this.backButton = new Graphics();
    this.backButton.roundRect(-60, -20, 120, 40, 8);
    this.backButton.fill(0x666666);
    this.backButton.stroke({ width: 2, color: 0xffffff });

    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "center",
    });

    this.backButtonText = new Text({
      text: "MENU",
      style: buttonTextStyle,
    });
    this.backButtonText.anchor.set(0.5);

    this.buttonContainer.addChild(this.backButton);
    this.buttonContainer.addChild(this.backButtonText);

    // Add hover effect
    this.buttonContainer.on("pointerenter", () => {
      this.backButton.clear();
      this.backButton.roundRect(-60, -20, 120, 40, 8);
      this.backButton.fill(0x777777);
      this.backButton.stroke({ width: 2, color: 0xffffff });
    });

    this.buttonContainer.on("pointerleave", () => {
      this.backButton.clear();
      this.backButton.roundRect(-60, -20, 120, 40, 8);
      this.backButton.fill(0x666666);
      this.backButton.stroke({ width: 2, color: 0xffffff });
    });

    // Add click handler to return to menu
    this.buttonContainer.on("pointerdown", () => {
      const menuScene = new MenuScene();
      menuScene.initialize();
      SceneManager.changeScene(menuScene);
    });

    // Create a simple game element (placeholder)
    const gameElement = new Graphics();
    gameElement.circle(0, 0, 30);
    gameElement.fill(0x00ff00);
    gameElement.x = screenWidth / 2;
    gameElement.y = screenHeight / 2;
    this.gameContainer.addChild(gameElement);

    // Add all elements to scene
    this.addChild(this.scoreText);
    this.addChild(levelText);
    this.addChild(this.gameContainer);
    this.addChild(this.buttonContainer);

    // Example: Increment score over time
    window.app.ticker.add(this.updateScore, this);
  }

  private updateScore = (): void => {
    this.score += 0.1;
    this.scoreText.text = `Score: ${Math.floor(this.score)}`;
  };

  update(deltaTime: number): void {
    // Update game logic here
    // For example, move game elements, check collisions, etc.
  }

  destroy(): void {
    window.app.ticker.remove(this.updateScore, this);
    this.buttonContainer.off("pointerenter");
    this.buttonContainer.off("pointerleave");
    this.buttonContainer.off("pointerdown");
    this.removeChildren();
  }
}
