import { Container, Text, TextStyle, Graphics } from "pixi.js";
import { Minimap } from "./Minimap";

export class Ui extends Container {
  private scoreText: Text;
  private levelText: Text;
  private backButton: Graphics;
  private backButtonText: Text;
  private buttonContainer: Container;
  private minimap: Minimap | undefined;

  constructor(screenWidth: number, screenHeight: number) {
    super();
    // Ensure UI is always on top by a very high zIndex
    this.zIndex = 9999;
    this.sortableChildren = true; // enable sorting if needed for children (optional)
    this.createUi(screenWidth, screenHeight);
  }

  private createUi(screenWidth: number, screenHeight: number): void {
    // Score Text
    const scoreStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 32,
      fill: 0xffffff,
      align: "left",
    });

    this.scoreText = new Text({
      text: "Score: 0",
      style: scoreStyle,
    });
    this.scoreText.x = 20;
    this.scoreText.y = 20;
    this.scoreText.zIndex = 10;
    // this.addChild(this.scoreText);

    // Level Text
    const levelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 28,
      fill: 0xffff00,
      align: "center",
    });

    this.levelText = new Text({
      text: "LEVEL 1",
      style: levelStyle,
    });
    this.levelText.anchor.set(0.5);
    this.levelText.x = screenWidth / 2;
    this.levelText.y = 50;
    this.levelText.zIndex = 10;
    // this.addChild(this.levelText);

    // Back Button
    this.buttonContainer = new Container();
    this.buttonContainer.x = 100;
    this.buttonContainer.y = screenHeight - 50;
    this.buttonContainer.eventMode = "static";
    this.buttonContainer.cursor = "pointer";
    this.buttonContainer.zIndex = 10;

    this.backButton = new Graphics();
    this.backButton.roundRect(-60, -20, 120, 40, 8);
    this.backButton.fill(0x666666);
    this.backButton.stroke({ width: 2, color: 0xffffff });
    this.backButton.zIndex = 1;

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
    this.backButtonText.zIndex = 2;

    this.buttonContainer.addChild(this.backButton);
    this.buttonContainer.addChild(this.backButtonText);
    this.addChild(this.buttonContainer);

    // Hover Effects
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
  }

  setScore(value: number): void {
    this.scoreText.text = `Score: ${Math.floor(value)}`;
  }

  setLevel(level: number): void {
    this.levelText.text = `LEVEL ${level}`;
  }

  setMinimap(minimap: Minimap): void {
    if (this.minimap) {
      this.removeChild(this.minimap);
    }
    this.minimap = minimap;
    this.minimap.zIndex = 10;
    this.addChild(minimap);
    this.sortChildren(); // Ensure new minimap respects zIndex
  }

  updateMinimap(): void {
    this.minimap?.update();
  }

  onBack(callback: () => void): void {
    this.buttonContainer.removeAllListeners("pointerdown");
    this.buttonContainer.on("pointerdown", callback);
  }

  destroy(options?: any): void {
    this.buttonContainer.off("pointerenter");
    this.buttonContainer.off("pointerleave");
    this.buttonContainer.off("pointerdown");
    this.removeChildren();
    super.destroy(options);
  }
}
