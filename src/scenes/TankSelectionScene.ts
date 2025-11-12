import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MainScene } from "./MainScene";
import { TankConfigRegistry } from "../core/tanks/TankConfig";
import { Tank1 } from "../core/tanks/Tank1";

export interface TankSelection {
  colorIndex: number; // 1-4
  baseIndex: number; // 1-4
  gunIndex: number; // 1-4
}

export class TankSelectionScene extends Scene {
  private background!: Graphics;
  private titleText!: Text;
  private selectedColor: number = 1;
  private selectedBase: number = 1;
  private selectedGun: number = 1;
  private previewTank: Container | null = null;
  private infoText!: Text;
  private startButton: Container | null = null;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  async initialize(): Promise<void> {
    const app = window.app;
    this.screenWidth = app.screen.width;
    this.screenHeight = app.screen.height;

    // Create background
    this.background = new Graphics();
    this.background.rect(0, 0, this.screenWidth, this.screenHeight);
    this.background.fill({ color: 0x1a1a1a });
    this.addChild(this.background);

    // Create title
    const titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 48,
      fill: 0xffffff,
      align: "center",
      fontWeight: "bold",
    });

    this.titleText = new Text({
      text: "SELECT YOUR TANK",
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = this.screenWidth / 2;
    this.titleText.y = 50;
    this.addChild(this.titleText);

    // Create selection sections
    this.createColorSelection();
    this.createBaseSelection();
    this.createGunSelection();
    this.createInfoSection();
    this.createStartButton();

    // Create preview
    await this.updatePreview();
  }

  private createColorSelection(): void {
    const sectionY = 120;
    const labelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
    });

    const label = new Text({
      text: "COLOR",
      style: labelStyle,
    });
    label.anchor.set(0.5);
    label.x = this.screenWidth / 4;
    label.y = sectionY;
    this.addChild(label);

    // Create 4 color buttons
    const buttonSize = 60;
    const spacing = 80;
    const startX = this.screenWidth / 4 - spacing * 1.5;

    for (let i = 1; i <= 4; i++) {
      const button = this.createColorButton(
        startX + (i - 1) * spacing,
        sectionY + 50,
        buttonSize,
        i,
        i === this.selectedColor
      );
      this.addChild(button);
    }
  }

  private createColorButton(
    x: number,
    y: number,
    size: number,
    colorIndex: number,
    isSelected: boolean
  ): Container {
    const button = new Container();
    button.x = x;
    button.y = y;
    button.eventMode = "static";
    button.cursor = "pointer";

    const graphics = new Graphics();
    const borderWidth = isSelected ? 4 : 2;
    const borderColor = isSelected ? 0xffff00 : 0xffffff;

    // Color swatch
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]; // Red, Green, Blue, Yellow
    graphics.roundRect(-size / 2, -size / 2, size, size, 8);
    graphics.fill(colors[colorIndex - 1]);
    graphics.stroke({ width: borderWidth, color: borderColor });

    button.addChild(graphics);

    button.on("pointerdown", () => {
      this.selectedColor = colorIndex;
      this.updateAllButtons();
      this.updatePreview().catch(console.error);
      this.updateInfo();
    });

    (button as any).type = "color";
    (button as any).index = colorIndex;

    return button;
  }

  private createBaseSelection(): void {
    const sectionY = 250;
    const labelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
    });

    const label = new Text({
      text: "TANK BASE",
      style: labelStyle,
    });
    label.anchor.set(0.5);
    label.x = this.screenWidth / 2;
    label.y = sectionY;
    this.addChild(label);

    // Create 4 base buttons
    const buttonSize = 80;
    const spacing = 100;
    const startX = this.screenWidth / 2 - spacing * 1.5;

    for (let i = 1; i <= 4; i++) {
      const button = this.createBaseButton(
        startX + (i - 1) * spacing,
        sectionY + 50,
        buttonSize,
        i,
        i === this.selectedBase
      );
      this.addChild(button);
    }
  }

  private createBaseButton(
    x: number,
    y: number,
    size: number,
    baseIndex: number,
    isSelected: boolean
  ): Container {
    const button = new Container();
    button.x = x;
    button.y = y;
    button.eventMode = "static";
    button.cursor = "pointer";

    const graphics = new Graphics();
    const borderWidth = isSelected ? 4 : 2;
    const borderColor = isSelected ? 0xffff00 : 0xffffff;

    graphics.roundRect(-size / 2, -size / 2, size, size, 8);
    graphics.fill(0x333333);
    graphics.stroke({ width: borderWidth, color: borderColor });

    // Base names
    const names = ["Scout", "Light", "Heavy", "Medium"];
    const textStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
      align: "center",
    });
    const text = new Text({
      text: names[baseIndex - 1],
      style: textStyle,
    });
    text.anchor.set(0.5);
    text.y = size / 2 + 20;

    button.addChild(graphics);
    button.addChild(text);

    button.on("pointerdown", () => {
      this.selectedBase = baseIndex;
      this.updateAllButtons();
      this.updatePreview().catch(console.error);
      this.updateInfo();
    });

    (button as any).type = "base";
    (button as any).index = baseIndex;

    return button;
  }

  private createGunSelection(): void {
    const sectionY = 380;
    const labelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
    });

    const label = new Text({
      text: "GUN",
      style: labelStyle,
    });
    label.anchor.set(0.5);
    label.x = (this.screenWidth / 4) * 3;
    label.y = sectionY;
    this.addChild(label);

    // Create 4 gun buttons
    const buttonSize = 80;
    const spacing = 100;
    const startX = (this.screenWidth / 4) * 3 - spacing * 1.5;

    for (let i = 1; i <= 4; i++) {
      const button = this.createGunButton(
        startX + (i - 1) * spacing,
        sectionY + 50,
        buttonSize,
        i,
        i === this.selectedGun
      );
      this.addChild(button);
    }
  }

  private createGunButton(
    x: number,
    y: number,
    size: number,
    gunIndex: number,
    isSelected: boolean
  ): Container {
    const button = new Container();
    button.x = x;
    button.y = y;
    button.eventMode = "static";
    button.cursor = "pointer";

    const graphics = new Graphics();
    const borderWidth = isSelected ? 4 : 2;
    const borderColor = isSelected ? 0xffff00 : 0xffffff;

    graphics.roundRect(-size / 2, -size / 2, size, size, 8);
    graphics.fill(0x333333);
    graphics.stroke({ width: borderWidth, color: borderColor });

    // Gun names
    const names = ["Rapid", "Balanced", "Sniper", "Heavy"];
    const textStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
      align: "center",
    });
    const text = new Text({
      text: names[gunIndex - 1],
      style: textStyle,
    });
    text.anchor.set(0.5);
    text.y = size / 2 + 20;

    button.addChild(graphics);
    button.addChild(text);

    button.on("pointerdown", () => {
      this.selectedGun = gunIndex;
      this.updateAllButtons();
      this.updatePreview().catch(console.error);
      this.updateInfo();
    });

    (button as any).type = "gun";
    (button as any).index = gunIndex;

    return button;
  }

  private createInfoSection(): void {
    const labelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
      fontWeight: "bold",
    });

    const infoLabel = new Text({
      text: "STATS",
      style: labelStyle,
    });
    infoLabel.anchor.set(0.5);
    infoLabel.x = this.screenWidth / 2;
    infoLabel.y = 480;
    this.addChild(infoLabel);

    const infoStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "left",
      wordWrap: true,
      wordWrapWidth: 500,
    });

    this.infoText = new Text({
      text: "",
      style: infoStyle,
    });
    this.infoText.anchor.set(0.5, 0);
    this.infoText.x = this.screenWidth / 2;
    this.infoText.y = 520;
    this.addChild(this.infoText);

    this.updateInfo();
  }

  private updateInfo(): void {
    const baseId = `tank${this.selectedBase}_color${this.selectedColor}`;
    const gunId = `cannon${this.selectedGun}_color${this.selectedColor}`;

    const baseConfig = TankConfigRegistry.getTankBase(baseId);
    const gunConfig = TankConfigRegistry.getTankGun(gunId);

    if (!baseConfig || !gunConfig) {
      this.infoText.text = "Loading...";
      return;
    }

    const baseNames = ["Scout Tank", "Light Tank", "Heavy Tank", "Medium Tank"];
    const gunNames = ["Rapid Fire", "Balanced", "Sniper", "Heavy"];

    const info = [
      `TANK: ${baseNames[this.selectedBase - 1]}`,
      `Speed: ${(baseConfig.speed * 100).toFixed(0)}%`,
      "",
      `GUN: ${gunNames[this.selectedGun - 1]}`,
      `Range: ${gunConfig.range}m`,
      `Fire Rate: ${gunConfig.fireRate}/s`,
      `Damage: ${gunConfig.damage}`,
      `Bullet Speed: ${(gunConfig.bulletSpeed * 100).toFixed(0)}%`,
    ].join("\n");

    this.infoText.text = info;
  }

  private async updatePreview(): Promise<void> {
    // Remove old preview
    if (this.previewTank) {
      this.removeChild(this.previewTank);
      this.previewTank.destroy({ children: true });
      this.previewTank = null;
    }

    const baseId = `tank${this.selectedBase}_color${this.selectedColor}`;
    const gunId = `cannon${this.selectedGun}_color${this.selectedColor}`;

    try {
      const tank = await Tank1.create({
        baseId: baseId,
        gunId: gunId,
        initialX: this.screenWidth / 2,
        initialY: this.screenHeight / 2 + 100,
        scale: 0.6, // Larger preview
      });

      this.previewTank = tank.container;
      this.addChild(this.previewTank);
    } catch (error) {
      console.error("Failed to create preview tank:", error);
    }
  }

  private updateAllButtons(): void {
    // Update all button borders based on selection
    this.children.forEach((child) => {
      if ((child as any).type === "color") {
        const isSelected = (child as any).index === this.selectedColor;
        const graphics = child.children[0] as Graphics;
        graphics.clear();
        const size = 60;
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        graphics.roundRect(-size / 2, -size / 2, size, size, 8);
        graphics.fill(colors[(child as any).index - 1]);
        graphics.stroke({
          width: isSelected ? 4 : 2,
          color: isSelected ? 0xffff00 : 0xffffff,
        });
      } else if ((child as any).type === "base") {
        const isSelected = (child as any).index === this.selectedBase;
        const graphics = child.children[0] as Graphics;
        graphics.clear();
        const size = 80;
        graphics.roundRect(-size / 2, -size / 2, size, size, 8);
        graphics.fill(0x333333);
        graphics.stroke({
          width: isSelected ? 4 : 2,
          color: isSelected ? 0xffff00 : 0xffffff,
        });
      } else if ((child as any).type === "gun") {
        const isSelected = (child as any).index === this.selectedGun;
        const graphics = child.children[0] as Graphics;
        graphics.clear();
        const size = 80;
        graphics.roundRect(-size / 2, -size / 2, size, size, 8);
        graphics.fill(0x333333);
        graphics.stroke({
          width: isSelected ? 4 : 2,
          color: isSelected ? 0xffff00 : 0xffffff,
        });
      }
    });
  }

  private createStartButton(): void {
    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 32,
      fill: 0xffffff,
      align: "center",
      fontWeight: "bold",
    });

    const buttonWidth = 250;
    const buttonHeight = 70;
    const buttonCorner = 12;

    this.startButton = this.createButton(
      this.screenWidth / 2,
      this.screenHeight - 80,
      buttonWidth,
      buttonHeight,
      buttonCorner,
      "START GAME",
      buttonTextStyle,
      0x4a90e2,
      0x5aa0f2,
      () => {
        this.startGame();
      }
    );
    this.addChild(this.startButton);
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
    const selection: TankSelection = {
      colorIndex: this.selectedColor,
      baseIndex: this.selectedBase,
      gunIndex: this.selectedGun,
    };

    // Save selection to cookie
    const selectionJson = JSON.stringify(selection);
    const CookieUtils = require("../core/CookieUtils").CookieUtils;
    CookieUtils.set("tankSelection", selectionJson);

    // Transition to MainScene with selection
    const mainScene = new MainScene();
    (mainScene as any).tankSelection = selection; // Pass selection to MainScene
    mainScene.initialize();
    SceneManager.changeScene(mainScene);
  }

  update(_deltaTime: number): void {
    // Selection scene doesn't need updates
  }

  destroy(): void {
    if (this.previewTank) {
      this.previewTank.destroy({ children: true });
    }
    if (this.startButton) {
      this.startButton.off("pointerenter");
      this.startButton.off("pointerleave");
      this.startButton.off("pointerdown");
    }
    this.removeChildren();
  }
}
