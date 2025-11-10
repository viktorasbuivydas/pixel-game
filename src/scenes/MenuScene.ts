import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MainScene } from "./MainScene";
import { CookieUtils } from "../core/CookieUtils";
import { UsernamePrompt } from "../core/UsernamePrompt";

export class MenuScene extends Scene {
  private titleText!: Text;
  private usernameChangeButton: Container | null = null;
  private backButton: Container | null = null;
  private currentUsername: string = "";

  initialize(): void {
    const app = window.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Get current username from cookie
    this.currentUsername = CookieUtils.get("username") || "";

    // Create title
    const titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 48,
      fill: 0xffffff,
      align: "center",
    });

    this.titleText = new Text({
      text: "MENIU",
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = screenWidth / 2;
    this.titleText.y = screenHeight / 3;

    // Create buttons
    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
    });

    const buttonWidth = 260;
    const buttonHeight = 50;
    const buttonCorner = 14;
    const buttonSpacing = 80;
    let buttonY = screenHeight / 2 - 40;

    // Username change button
    this.usernameChangeButton = this.createButton(
      screenWidth / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      buttonCorner,
      `Vardas: ${this.currentUsername || "Nenustatytas"}`,
      buttonTextStyle,
      0x4a90e2,
      0x5aa0f2,
      () => {
        this.showUsernameChange();
      }
    );
    this.addChild(this.usernameChangeButton);
    buttonY += buttonSpacing;

    // Back button (Grįžti atgal)
    this.backButton = this.createButton(
      screenWidth / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      buttonCorner,
      "Grįžti atgal",
      buttonTextStyle,
      0x666666,
      0x777777,
      () => {
        // Return to MainScene
        const gameScene = new MainScene();
        gameScene.initialize();
        SceneManager.changeScene(gameScene);
      }
    );
    this.addChild(this.backButton);

    // Add title
    this.addChild(this.titleText);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    corner: number,
    label: string,
    textStyle: TextStyle,
    color: number,
    hoverColor: number,
    onClick: () => void
  ): Container {
    const buttonContainer = new Container();
    buttonContainer.x = x;
    buttonContainer.y = y;
    buttonContainer.eventMode = "static";
    buttonContainer.cursor = "pointer";

    const buttonGraphics = new Graphics();
    buttonGraphics.roundRect(-width / 2, -height / 2, width, height, corner);
    buttonGraphics.fill(color);
    buttonGraphics.stroke({ width: 2, color: 0xffffff });

    const buttonText = new Text({
      text: label,
      style: textStyle,
    });
    buttonText.anchor.set(0.5);

    buttonContainer.addChild(buttonGraphics);
    buttonContainer.addChild(buttonText);

    // Hover effects
    buttonContainer.on("pointerenter", () => {
      buttonGraphics.clear();
      buttonGraphics.roundRect(-width / 2, -height / 2, width, height, corner);
      buttonGraphics.fill(hoverColor);
      buttonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    buttonContainer.on("pointerleave", () => {
      buttonGraphics.clear();
      buttonGraphics.roundRect(-width / 2, -height / 2, width, height, corner);
      buttonGraphics.fill(color);
      buttonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    buttonContainer.on("pointerdown", onClick);

    return buttonContainer;
  }

  private showUsernameChange(): void {
    const app = window.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    const usernamePrompt = new UsernamePrompt(
      screenWidth,
      screenHeight,
      this.currentUsername,
      (username: string) => {
        // Save new username to cookie
        CookieUtils.set("username", username);
        this.currentUsername = username;
        // Update button text
        if (this.usernameChangeButton) {
          const text = this.usernameChangeButton.children.find(
            (child) => child instanceof Text
          ) as Text;
          if (text) {
            text.text = `Vardas: ${username}`;
          }
        }
        // Remove prompt
        this.removeChild(usernamePrompt);
        usernamePrompt.destroy();
      }
    );
    this.addChild(usernamePrompt);
  }

  update(_deltaTime: number): void {
    // Menu scene doesn't need updates, but method is required
  }

  destroy(): void {
    // Remove listeners
    if (this.usernameChangeButton) {
      this.usernameChangeButton.off("pointerenter");
      this.usernameChangeButton.off("pointerleave");
      this.usernameChangeButton.off("pointerdown");
    }
    if (this.backButton) {
      this.backButton.off("pointerenter");
      this.backButton.off("pointerleave");
      this.backButton.off("pointerdown");
    }
    this.removeChildren();
  }
}
