import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MainScene } from "./MainScene";
import { CookieUtils } from "../core/CookieUtils";

export class SignInScene extends Scene {
  private titleText!: Text;
  private inputElement: HTMLInputElement;
  private playButton: Container | null = null;
  private background: Graphics;

  initialize(): void {
    const app = window.app;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;

    // Create background
    this.background = new Graphics();
    this.background.rect(0, 0, screenWidth, screenHeight);
    this.background.fill({ color: 0x111111 });
    this.addChild(this.background);

    // Create title
    const titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 64,
      fill: 0xffffff,
      align: "center",
      fontWeight: "bold",
    });

    this.titleText = new Text({
      text: "TANK GAME",
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = screenWidth / 2;
    this.titleText.y = screenHeight / 3;
    this.addChild(this.titleText);

    // Get saved username from cookie
    const savedUsername = CookieUtils.get("username") || "";

    // Create username input
    const inputWidth = 400;
    const inputHeight = 50;
    const inputX = (screenWidth - inputWidth) / 2;
    const inputY = screenHeight / 2;

    // Create HTML input element
    this.inputElement = document.createElement("input");
    this.inputElement.type = "text";
    this.inputElement.value = savedUsername;
    this.inputElement.placeholder = "Enter your username";
    this.inputElement.maxLength = 20;
    this.inputElement.style.position = "absolute";
    this.inputElement.style.left = `${inputX}px`;
    this.inputElement.style.top = `${inputY}px`;
    this.inputElement.style.width = `${inputWidth}px`;
    this.inputElement.style.height = `${inputHeight}px`;
    this.inputElement.style.padding = "0 15px";
    this.inputElement.style.fontSize = "20px";
    this.inputElement.style.border = "2px solid #ffffff";
    this.inputElement.style.borderRadius = "8px";
    this.inputElement.style.backgroundColor = "#1a1a1a";
    this.inputElement.style.color = "#ffffff";
    this.inputElement.style.outline = "none";
    this.inputElement.style.textAlign = "center";
    document.body.appendChild(this.inputElement);

    // Focus input
    setTimeout(() => this.inputElement.focus(), 100);

    // Handle Enter key
    this.inputElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.startGame();
      }
    });

    // Create Play button
    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 28,
      fill: 0xffffff,
      align: "center",
      fontWeight: "bold",
    });

    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonCorner = 12;

    this.playButton = this.createButton(
      screenWidth / 2,
      screenHeight / 2 + 100,
      buttonWidth,
      buttonHeight,
      buttonCorner,
      "PLAY",
      buttonTextStyle,
      0x4a90e2,
      0x5aa0f2,
      () => {
        this.startGame();
      }
    );
    this.addChild(this.playButton);
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
    buttonGraphics.stroke({ width: 3, color: 0xffffff });

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
      buttonGraphics.stroke({ width: 3, color: 0xffffff });
    });

    buttonContainer.on("pointerleave", () => {
      buttonGraphics.clear();
      buttonGraphics.roundRect(-width / 2, -height / 2, width, height, corner);
      buttonGraphics.fill(color);
      buttonGraphics.stroke({ width: 3, color: 0xffffff });
    });

    buttonContainer.on("pointerdown", onClick);

    return buttonContainer;
  }

  private startGame(): void {
    const username = this.inputElement.value.trim();
    if (username.length === 0) {
      alert("Please enter a username");
      return;
    }
    if (username.length > 20) {
      alert("Username must be 20 characters or less");
      return;
    }

    // Save username to cookie
    CookieUtils.set("username", username);

    // Remove input element
    if (this.inputElement && this.inputElement.parentNode) {
      document.body.removeChild(this.inputElement);
    }

    // Transition to MainScene
    const mainScene = new MainScene();
    mainScene.initialize();
    SceneManager.changeScene(mainScene);
  }

  update(_deltaTime: number): void {
    // Sign-in scene doesn't need updates
  }

  destroy(): void {
    // Clean up input element if still exists
    if (this.inputElement && this.inputElement.parentNode) {
      document.body.removeChild(this.inputElement);
    }

    // Remove listeners
    if (this.playButton) {
      this.playButton.off("pointerenter");
      this.playButton.off("pointerleave");
      this.playButton.off("pointerdown");
    }

    this.removeChildren();
  }
}
