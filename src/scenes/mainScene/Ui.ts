// Note: Flexbox is a CSS layout system for HTML. PixiJS is a WebGL/canvas renderer and does not support CSS, so you cannot use Flexbox directly for PixiJS UI elements.
// However, you can mimic flexbox-like layouts by creating "row" and "column" containers and distributing children programmatically.
//
// This rewrite demonstrates a simple flexbox-like layout in PixiJS by using containers and arranging their children manually.
// Enhanced: UI elements scale responsively to match screen size.

import { Container, Text, TextStyle, Graphics } from "pixi.js";
import { ButtonContainer } from "@pixi/ui";
import { Minimap } from "./Minimap";

export class Ui extends Container {
  private killsText!: Text;
  private levelText!: Text;
  private backButton!: ButtonContainer;
  private minimap: Minimap | undefined;
  private pingText!: Text;
  private fpsText!: Text;

  private rootColumn!: Container;
  private topRow!: Container;
  private centerRow!: Container;
  private bottomRow!: Container;

  private screenWidth: number;
  private screenHeight: number;

  // Store UI font/button sizes for responsive updates
  private baseFontSize = 32;
  private baseStatsFontSize = 16;
  private baseLevelFontSize = 28;
  private baseButtonFontSize = 18;
  private baseButtonWidth = 120;
  private baseButtonHeight = 40;
  private baseButtonRadius = 8;
  private basePadding = 20;

  // Store original styles for easy resizing
  private killsStyle!: TextStyle;
  private statsStyle!: TextStyle;
  private levelStyle!: TextStyle;
  private buttonTextStyle!: TextStyle;
  private buttonGraphics!: Graphics;
  private buttonText!: Text;

  constructor(screenWidth: number, screenHeight: number) {
    super();
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.zIndex = 9999;
    this.sortableChildren = true;
    this.createUi(screenWidth, screenHeight);
  }

  private createUi(screenWidth: number, screenHeight: number): void {
    const rootColumn = new Container();

    // --- Top Row
    const topRow = new Container();

    // Responsive font scaling factor
    const scale = this._getScale(screenWidth, screenHeight);

    // Kills (Left)
    this.killsStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: this.baseFontSize * scale,
      fill: 0xffffff,
      align: "left",
    });
    this.killsText = new Text({
      text: "Kills: 0",
      style: this.killsStyle,
    });
    this.killsText.anchor.set(0, 0);
    this.killsText.zIndex = 10;
    topRow.addChild(this.killsText);

    // Ping (Right, top)
    this.statsStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: this.baseStatsFontSize * scale,
      fill: 0xffffff,
      align: "right",
    });
    this.pingText = new Text({
      text: "Ping: --ms",
      style: this.statsStyle,
    });
    this.pingText.anchor.set(1, 0);
    this.pingText.zIndex = 10;
    topRow.addChild(this.pingText);

    // FPS (Right, under ping)
    this.fpsText = new Text({
      text: "FPS: --",
      style: this.statsStyle,
    });
    this.fpsText.anchor.set(1, 0);
    this.fpsText.zIndex = 10;
    topRow.addChild(this.fpsText);

    // Center Row (just the level text)
    const centerRow = new Container();
    this.levelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: this.baseLevelFontSize * scale,
      fill: 0xffff00,
      align: "center",
    });
    this.levelText = new Text({
      text: "LEVEL 1",
      style: this.levelStyle,
    });
    this.levelText.anchor.set(0.5);
    this.levelText.zIndex = 10;
    centerRow.addChild(this.levelText);

    // Bottom Row (back button left, minimap right)
    const bottomRow = new Container();

    // Back Button (Left): Responsive sizing
    const buttonWidth = this.baseButtonWidth * scale;
    const buttonHeight = this.baseButtonHeight * scale;
    const buttonRadius = this.baseButtonRadius * scale;

    this.buttonGraphics = new Graphics();
    this.buttonGraphics.roundRect(
      0,
      0,
      buttonWidth,
      buttonHeight,
      buttonRadius
    );
    this.buttonGraphics.fill(0x666666);
    this.buttonGraphics.stroke({ width: 2 * scale, color: 0xffffff });

    this.buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: this.baseButtonFontSize * scale,
      fill: 0xffffff,
      align: "center",
    });
    this.buttonText = new Text({
      text: "MENU",
      style: this.buttonTextStyle,
    });
    this.buttonText.anchor.set(0.5);
    this.buttonText.x = buttonWidth / 2;
    this.buttonText.y = buttonHeight / 2;

    const buttonContainer = new Container();
    buttonContainer.addChild(this.buttonGraphics);
    buttonContainer.addChild(this.buttonText);
    this.backButton = new ButtonContainer(buttonContainer);

    // Add hover effects (responsive fill)
    this.backButton.onHover.connect(() => {
      this.buttonGraphics.clear();
      this.buttonGraphics.roundRect(
        0,
        0,
        buttonWidth,
        buttonHeight,
        buttonRadius
      );
      this.buttonGraphics.fill(0x777777);
      this.buttonGraphics.stroke({ width: 2 * scale, color: 0xffffff });
    });
    this.backButton.onOut.connect(() => {
      this.buttonGraphics.clear();
      this.buttonGraphics.roundRect(
        0,
        0,
        buttonWidth,
        buttonHeight,
        buttonRadius
      );
      this.buttonGraphics.fill(0x666666);
      this.buttonGraphics.stroke({ width: 2 * scale, color: 0xffffff });
    });

    bottomRow.addChild(this.backButton);

    // Minimap (right) -- added dynamically, positioned in relayout

    // Add rows to rootColumn
    rootColumn.addChild(topRow);
    rootColumn.addChild(centerRow);
    rootColumn.addChild(bottomRow);

    this.rootColumn = rootColumn;
    this.topRow = topRow;
    this.centerRow = centerRow;
    this.bottomRow = bottomRow;

    this.addChild(rootColumn);

    this._flexLayout(screenWidth, screenHeight);
  }

  // Helper: scale factor based on base (1920x1080 is scale 1)
  private _getScale(screenWidth: number, screenHeight: number): number {
    // Target reference is 1920x1080.
    const baseW = 1920;
    const baseH = 1080;
    const scaleW = screenWidth / baseW;
    const scaleH = screenHeight / baseH;
    // Use minimum, but clamp to 0.5..2 for readability
    return Math.max(0.5, Math.min(2, Math.min(scaleW, scaleH)));
  }

  // Mimic flexbox layout by manually sizing and positioning children
  private _flexLayout(screenWidth: number, screenHeight: number) {
    const scale = this._getScale(screenWidth, screenHeight);
    const PADDING = this.basePadding * scale;
    const TOP_MARGIN = 20 * scale;

    // --- Update style/font on all text fields for responsiveness
    this.killsText.style = new TextStyle({
      ...this.killsStyle,
      fontSize: this.baseFontSize * scale,
    });
    this.pingText.style = new TextStyle({
      ...this.statsStyle,
      fontSize: this.baseStatsFontSize * scale,
    });
    this.fpsText.style = new TextStyle({
      ...this.statsStyle,
      fontSize: this.baseStatsFontSize * scale,
    });
    this.levelText.style = new TextStyle({
      ...this.levelStyle,
      fontSize: this.baseLevelFontSize * scale,
    });
    if (this.buttonTextStyle) {
      this.buttonText.style = new TextStyle({
        ...this.buttonTextStyle,
        fontSize: this.baseButtonFontSize * scale,
      });
    }

    // --- Top Row: Responsive positions
    this.killsText.x = PADDING;
    this.killsText.y = TOP_MARGIN;

    this.pingText.x = screenWidth - PADDING;
    this.pingText.y = TOP_MARGIN;

    this.fpsText.x = screenWidth - PADDING;
    this.fpsText.y = TOP_MARGIN + this.pingText.height + 6 * scale;

    // Level (centered at top, under topRow)
    this.levelText.x = screenWidth / 2;
    this.levelText.y = TOP_MARGIN + this.killsText.height / 2;

    // --- Bottom Row
    // Update back button size and position
    const buttonWidth = this.baseButtonWidth * scale;
    const buttonHeight = this.baseButtonHeight * scale;
    const buttonRadius = this.baseButtonRadius * scale;

    // Redraw back button (preserve hover effect color, check graphics style)
    let currentFill = 0x666666;
    if (this.buttonGraphics) {
      if (
        (this.buttonGraphics as any)._fillStyle &&
        (this.buttonGraphics as any)._fillStyle.color === 0x777777
      )
        currentFill = 0x777777;
    }
    this.buttonGraphics.clear();
    this.buttonGraphics.roundRect(
      0,
      0,
      buttonWidth,
      buttonHeight,
      buttonRadius
    );
    this.buttonGraphics.fill(currentFill);
    this.buttonGraphics.stroke({ width: 2 * scale, color: 0xffffff });

    // Adjust buttonText position
    this.buttonText.x = buttonWidth / 2;
    this.buttonText.y = buttonHeight / 2;

    // Place back button (left bottom)
    this.backButton.x = PADDING;
    this.backButton.y = screenHeight - buttonHeight - PADDING;

    // Minimap (right bottom) if present
    if (this.minimap) {
      // If the minimap has setSize, make it scale-aware (otherwise, just move it)
      let minimapScale = scale;
      if (typeof (this.minimap as any).setSize === "function") {
        // Set a fixed fraction of the screen as minimap size, if API allows
        let miniSize = Math.round(Math.max(screenWidth, screenHeight) * 0.2);
        (this.minimap as any).setSize(miniSize, miniSize);
      } else {
        // Fallback: scale minimap
        this.minimap.scale.set(minimapScale, minimapScale);
      }

      this.minimap.zIndex = 10;
      // Right-bottom align, respecting the minimap's size after scaling, and padding
      this.minimap.x = screenWidth - (this.minimap.width || 0) - PADDING;
      this.minimap.y = screenHeight - (this.minimap.height || 0) - PADDING;
      if (!this.bottomRow.children.includes(this.minimap)) {
        this.bottomRow.addChild(this.minimap);
      }
    }
  }

  setKills(value: number): void {
    this.killsText.text = `Kills: ${Math.floor(value)}`;
  }

  setLevel(level: number): void {
    this.levelText.text = `LEVEL ${level}`;
  }

  setMinimap(minimap: Minimap): void {
    if (this.minimap && this.bottomRow.children.includes(this.minimap)) {
      this.bottomRow.removeChild(this.minimap);
    }
    this.minimap = minimap;
    this.minimap.zIndex = 10;
    // Add to bottom row and relayout
    this.bottomRow.addChild(minimap);
    this._flexLayout(this.screenWidth, this.screenHeight);
  }

  updateMinimap(): void {
    this.minimap?.update();
  }

  setPing(latency: number): void {
    this.pingText.text = `Ping: ${Math.round(latency)}ms`;
  }

  setFps(fps: number): void {
    this.fpsText.text = `FPS: ${Math.round(fps)}`;
  }

  setHealth(_health: number): void {
    // No-op: health is now displayed above tanks
  }

  onBack(callback: () => void): void {
    this.backButton.onPress.connect(callback);
  }

  // Call this to relayout responsively on window or viewport resize
  relayout(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this._flexLayout(screenWidth, screenHeight);
  }

  destroy(options?: any): void {
    this.backButton.onPress.disconnectAll();
    this.backButton.onHover.disconnectAll();
    this.backButton.onOut.disconnectAll();
    this.removeChildren();
    super.destroy(options);
  }
}
