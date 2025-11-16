import { Container, Graphics, Text, TextStyle, Sprite, Assets } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { MainScene } from "./MainScene";
import { TankConfigRegistry } from "../core/tanks/TankConfig";
import { TankEntity } from "../core/tanks/TankEntity";
import { CookieUtils } from "../core/CookieUtils";
import { TankPreviewScene } from "./TankPreviewScene";
import {
  getTankBaseIdFromIndex,
  getGunIdFromIndex,
} from "../core/tanks/TankUniqueIds";

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
  private previewButton: Container | null = null;
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
    await this.createBaseSelection();
    await this.createGunSelection();
    this.createInfoSection();
    this.createStartButton();
    this.createPreviewButton();

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

    button.on("pointerdown", async () => {
      this.selectedColor = colorIndex;
      await this.updateAllButtons();
      this.updatePreview().catch(console.error);
      this.updateInfo();
    });

    (button as any).type = "color";
    (button as any).index = colorIndex;

    return button;
  }

  private async createBaseSelection(): Promise<void> {
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
      const button = await this.createBaseButton(
        startX + (i - 1) * spacing,
        sectionY + 50,
        buttonSize,
        i,
        i === this.selectedBase
      );
      this.addChild(button);
    }
  }

  private async createBaseButton(
    x: number,
    y: number,
    size: number,
    baseIndex: number,
    isSelected: boolean
  ): Promise<Container> {
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
    button.addChild(graphics); // Add graphics first (background)

    // Load and display tank base sprite
    const baseId = getTankBaseIdFromIndex(baseIndex, this.selectedColor);
    const baseConfig = TankConfigRegistry.getTankBase(baseId);

    if (baseConfig) {
      try {
        const baseTexture = await Assets.load(baseConfig.baseTextureUrl);
        const baseSprite = new Sprite(baseTexture);
        baseSprite.anchor.set(0.5);
        baseSprite.scale.set(0.3); // Scale down to fit in button
        button.addChild(baseSprite); // Add sprite on top of graphics
        (button as any).baseSprite = baseSprite;
      } catch (error) {
        console.error(`Failed to load base sprite for ${baseId}:`, error);
      }
    }

    // Base names below button
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
    button.addChild(text); // Add text last (on top)

    button.on("pointerdown", async () => {
      this.selectedBase = baseIndex;
      await this.updateAllButtons();
      this.updatePreview().catch(console.error);
      this.updateInfo();
    });

    (button as any).type = "base";
    (button as any).index = baseIndex;

    return button;
  }

  private async createGunSelection(): Promise<void> {
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
      const button = await this.createGunButton(
        startX + (i - 1) * spacing,
        sectionY + 50,
        buttonSize,
        i,
        i === this.selectedGun
      );
      this.addChild(button);
    }
  }

  private async createGunButton(
    x: number,
    y: number,
    size: number,
    gunIndex: number,
    isSelected: boolean
  ): Promise<Container> {
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
    button.addChild(graphics); // Add graphics first (background)

    // Load and display gun sprite
    const gunId = getGunIdFromIndex(gunIndex, this.selectedColor);
    const gunConfig = TankConfigRegistry.getTankGun(gunId);

    if (gunConfig) {
      try {
        const gunTexture = await Assets.load(gunConfig.gunTextureUrl);
        const gunSprite = new Sprite(gunTexture);
        gunSprite.anchor.set(0.5);
        gunSprite.scale.set(0.4); // Scale down to fit in button
        button.addChild(gunSprite); // Add sprite on top of graphics
        (button as any).gunSprite = gunSprite;
      } catch (error) {
        console.error(`Failed to load gun sprite for ${gunId}:`, error);
      }
    }

    // Gun names below button
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
    button.addChild(text); // Add text last (on top)

    button.on("pointerdown", async () => {
      this.selectedGun = gunIndex;
      await this.updateAllButtons();
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
    this.infoText.y = 320;
    this.addChild(this.infoText);

    this.updateInfo();
  }

  private updateInfo(): void {
    const baseId = getTankBaseIdFromIndex(
      this.selectedBase,
      this.selectedColor
    );
    const gunId = getGunIdFromIndex(this.selectedGun, this.selectedColor);

    const baseConfig = TankConfigRegistry.getTankBase(baseId);
    const gunConfig = TankConfigRegistry.getTankGun(gunId);

    if (!baseConfig || !gunConfig) {
      this.infoText.text = "Loading...";
      return;
    }

    const info = [
      `TANK: ${baseConfig.name}`,
      `Speed: ${(baseConfig.speed * 100).toFixed(0)}%`,
      "",
      `GUN: ${gunConfig.name}`,
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

    const baseId = getTankBaseIdFromIndex(
      this.selectedBase,
      this.selectedColor
    );
    const gunId = getGunIdFromIndex(this.selectedGun, this.selectedColor);

    try {
      const tank = await TankEntity.create({
        baseId: baseId,
        gunId: gunId,
        initialX: this.screenWidth / 2,
        initialY: this.screenHeight / 2 + 50,
        scale: 1, // Larger preview
      });

      this.previewTank = tank.container;
      this.addChild(this.previewTank);
    } catch (error) {
      console.error("Failed to create preview tank:", error);
    }
  }

  private async updateAllButtons(): Promise<void> {
    // Update all button borders and sprites based on selection
    for (const child of this.children) {
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
        const baseIndex = (child as any).index;

        // Update border
        const graphics = child.children.find(
          (c: any) => c instanceof Graphics
        ) as Graphics;
        if (graphics) {
          graphics.clear();
          const size = 80;
          graphics.roundRect(-size / 2, -size / 2, size, size, 8);
          graphics.fill(0x333333);
          graphics.stroke({
            width: isSelected ? 4 : 2,
            color: isSelected ? 0xffff00 : 0xffffff,
          });
        }

        // Update sprite if color changed
        const baseSprite = (child as any).baseSprite as Sprite | undefined;
        if (baseSprite) {
          const baseId = getTankBaseIdFromIndex(baseIndex, this.selectedColor);
          const baseConfig = TankConfigRegistry.getTankBase(baseId);
          if (baseConfig) {
            try {
              const baseTexture = await Assets.load(baseConfig.baseTextureUrl);
              baseSprite.texture = baseTexture;
            } catch (error) {
              console.error(`Failed to update base sprite:`, error);
            }
          }
        }
      } else if ((child as any).type === "gun") {
        const isSelected = (child as any).index === this.selectedGun;
        const gunIndex = (child as any).index;

        // Update border
        const graphics = child.children.find(
          (c: any) => c instanceof Graphics
        ) as Graphics;
        if (graphics) {
          graphics.clear();
          const size = 80;
          graphics.roundRect(-size / 2, -size / 2, size, size, 8);
          graphics.fill(0x333333);
          graphics.stroke({
            width: isSelected ? 4 : 2,
            color: isSelected ? 0xffff00 : 0xffffff,
          });
        }

        // Update sprite if color changed
        const gunSprite = (child as any).gunSprite as Sprite | undefined;
        if (gunSprite) {
          const gunId = getGunIdFromIndex(gunIndex, this.selectedColor);
          const gunConfig = TankConfigRegistry.getTankGun(gunId);
          if (gunConfig) {
            try {
              const gunTexture = await Assets.load(gunConfig.gunTextureUrl);
              gunSprite.texture = gunTexture;
            } catch (error) {
              console.error(`Failed to update gun sprite:`, error);
            }
          }
        }
      }
    }
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

  private createPreviewButton(): void {
    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "center",
    });

    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonCorner = 12;

    this.previewButton = this.createButton(
      this.screenWidth - buttonWidth / 2 - 20,
      this.screenHeight - 80,
      buttonWidth,
      buttonHeight,
      buttonCorner,
      "PREVIEW ALL",
      buttonTextStyle,
      0x666666,
      0x777777,
      () => {
        const previewScene = new TankPreviewScene();
        previewScene.initialize();
        SceneManager.changeScene(previewScene);
      }
    );
    this.addChild(this.previewButton);
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

  private async startGame(): Promise<void> {
    try {
      const selection: TankSelection = {
        colorIndex: this.selectedColor,
        baseIndex: this.selectedBase,
        gunIndex: this.selectedGun,
      };

      // Save selection to cookie
      const selectionJson = JSON.stringify(selection);
      CookieUtils.set("tankSelection", selectionJson);

      // Transition to MainScene with selection
      const mainScene = new MainScene();
      mainScene.tankSelection = selection; // Pass selection to MainScene

      // Initialize the main scene (this is async)
      await mainScene.initialize();

      // Change to the main scene after initialization completes
      SceneManager.changeScene(mainScene);
    } catch (error) {
      console.error("Error starting game:", error);
      // Optionally show an error message to the user
    }
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
