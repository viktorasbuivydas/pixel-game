import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MainScene } from "./MainScene";

export class MenuScene extends Scene {
  private titleText: Text;
  private buttonContainers: Container[] = [];
  private gameModes = [
    {
      label: "Battle Royale",
      value: "battle_royale",
      color: 0x4a90e2,
      hoverColor: 0x5aa0f2,
    },
    {
      label: "Capture the Flag",
      value: "capture_the_flag",
      color: 0xe24a4a,
      hoverColor: 0xf25a5a,
    },
  ];

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

    // Create buttons for each game mode
    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
    });

    const buttonSpacing = 80;
    const buttonWidth = 260;
    const buttonHeight = 50;
    const buttonCorner = 14;

    this.buttonContainers = [];

    for (let i = 0; i < this.gameModes.length; i++) {
      const mode = this.gameModes[i];

      // Button container handles pointer events
      const buttonContainer = new Container();
      buttonContainer.x = screenWidth / 2;
      buttonContainer.y =
        screenHeight / 2 +
        i * buttonSpacing -
        ((this.gameModes.length - 1) * buttonSpacing) / 2;
      buttonContainer.eventMode = "static";
      buttonContainer.cursor = "pointer";

      // Graphics for the button background
      const buttonGraphics = new Graphics();
      buttonGraphics.roundRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        buttonCorner
      );
      buttonGraphics.fill(mode.color);
      buttonGraphics.stroke({ width: 2, color: 0xffffff });

      // Button label
      const buttonText = new Text({
        text: mode.label,
        style: buttonTextStyle,
      });
      buttonText.anchor.set(0.5);

      buttonContainer.addChild(buttonGraphics);
      buttonContainer.addChild(buttonText);

      // Hover effects
      buttonContainer.on("pointerenter", () => {
        buttonGraphics.clear();
        buttonGraphics.roundRect(
          -buttonWidth / 2,
          -buttonHeight / 2,
          buttonWidth,
          buttonHeight,
          buttonCorner
        );
        buttonGraphics.fill(mode.hoverColor);
        buttonGraphics.stroke({ width: 2, color: 0xffffff });
      });

      buttonContainer.on("pointerleave", () => {
        buttonGraphics.clear();
        buttonGraphics.roundRect(
          -buttonWidth / 2,
          -buttonHeight / 2,
          buttonWidth,
          buttonHeight,
          buttonCorner
        );
        buttonGraphics.fill(mode.color);
        buttonGraphics.stroke({ width: 2, color: 0xffffff });
      });

      // Click handler
      buttonContainer.on("pointerdown", () => {
        // Optionally: Pass game mode to MainScene via constructor/options
        const gameScene = new MainScene({ gameMode: mode.value });
        gameScene.initialize();
        SceneManager.changeScene(gameScene);
      });

      this.buttonContainers.push(buttonContainer);
    }

    // Add all elements to scene
    this.addChild(this.titleText);
    this.buttonContainers.forEach((container) => this.addChild(container));
  }

  update(deltaTime: number): void {
    // Menu scene doesn't need updates, but method is required
  }

  destroy(): void {
    // Remove listeners and children for all mode buttons
    this.buttonContainers.forEach((container) => {
      container.off("pointerenter");
      container.off("pointerleave");
      container.off("pointerdown");
    });
    this.removeChildren();
  }
}
