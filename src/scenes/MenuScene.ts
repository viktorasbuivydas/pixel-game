import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { Level1GameScene } from "./Level1GameScene";

export class MenuScene extends Scene {
  private titleText: Text;
  private startButton: Graphics;
  private startButtonText: Text;
  private buttonContainer: Container;

  initialize(): void {
    const app = window.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Create title
    const titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 48,
      fill: 0xffffff,
      align: "center",
    });

    this.titleText = new Text({
      text: "PIXEL GAME",
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = screenWidth / 2;
    this.titleText.y = screenHeight / 3;

    // Create start button
    this.buttonContainer = new Container();
    this.buttonContainer.x = screenWidth / 2;
    this.buttonContainer.y = screenHeight / 2;
    this.buttonContainer.eventMode = "static";
    this.buttonContainer.cursor = "pointer";

    this.startButton = new Graphics();
    this.startButton.roundRect(-100, -25, 200, 50, 10);
    this.startButton.fill(0x4a90e2);
    this.startButton.stroke({ width: 2, color: 0xffffff });

    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
    });

    this.startButtonText = new Text({
      text: "START GAME",
      style: buttonTextStyle,
    });
    this.startButtonText.anchor.set(0.5);

    this.buttonContainer.addChild(this.startButton);
    this.buttonContainer.addChild(this.startButtonText);

    // Add hover effect
    this.buttonContainer.on("pointerenter", () => {
      this.startButton.clear();
      this.startButton.roundRect(-100, -25, 200, 50, 10);
      this.startButton.fill(0x5aa0f2);
      this.startButton.stroke({ width: 2, color: 0xffffff });
    });

    this.buttonContainer.on("pointerleave", () => {
      this.startButton.clear();
      this.startButton.roundRect(-100, -25, 200, 50, 10);
      this.startButton.fill(0x4a90e2);
      this.startButton.stroke({ width: 2, color: 0xffffff });
    });

    // Add click handler to start game
    this.buttonContainer.on("pointerdown", () => {
      const gameScene = new Level1GameScene();
      gameScene.initialize();
      SceneManager.changeScene(gameScene);
    });

    // Add all elements to scene
    this.addChild(this.titleText);
    this.addChild(this.buttonContainer);
  }

  update(deltaTime: number): void {
    // Menu scene doesn't need updates, but method is required
  }

  destroy(): void {
    this.buttonContainer.off("pointerenter");
    this.buttonContainer.off("pointerleave");
    this.buttonContainer.off("pointerdown");
    this.removeChildren();
  }
}
