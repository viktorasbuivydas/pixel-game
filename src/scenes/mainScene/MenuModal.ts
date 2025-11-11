import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { CookieUtils } from "../../core/CookieUtils";
import { UsernamePrompt } from "../../core/UsernamePrompt";

export class MenuModal extends Container {
  private overlay: Graphics;
  private modal: Graphics;
  private titleText: Text;
  private usernameChangeButton: Container | null = null;
  private backButton: Container | null = null;
  private currentUsername: string = "";
  private isVisible: boolean = false;
  private screenWidth: number;
  private screenHeight: number;
  private onUsernameChange?: (username: string) => void;

  constructor(
    screenWidth: number,
    screenHeight: number,
    onUsernameChange?: (username: string) => void
  ) {
    super();
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.onUsernameChange = onUsernameChange;
    this.zIndex = 100000; // Very high z-index to be on top
    this.visible = false;

    // Get current username from cookie
    this.currentUsername = CookieUtils.get("username") || "";

    // Create overlay background
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, screenWidth, screenHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.overlay.eventMode = "static";
    this.overlay.cursor = "default";
    this.addChild(this.overlay);

    // Create modal background
    const modalWidth = 400;
    const modalHeight = 300;
    const modalX = (screenWidth - modalWidth) / 2;
    const modalY = (screenHeight - modalHeight) / 2;

    this.modal = new Graphics();
    this.modal.roundRect(modalX, modalY, modalWidth, modalHeight, 10);
    this.modal.fill(0x2a2a2a);
    this.modal.stroke({ width: 2, color: 0xffffff });
    this.addChild(this.modal);

    // Title
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
    this.titleText.y = modalY + 50;
    this.addChild(this.titleText);

    // Create buttons
    this.createButtons(modalX, modalY, modalWidth);
  }

  private createButtons(
    modalX: number,
    modalY: number,
    modalWidth: number
  ): void {
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
    let buttonY = modalY + 120;

    // Username change button
    this.usernameChangeButton = this.createButton(
      this.screenWidth / 2,
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

    // Back button (Grįžti atgal) - just closes the modal
    this.backButton = this.createButton(
      this.screenWidth / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      buttonCorner,
      "Grįžti atgal",
      buttonTextStyle,
      0x666666,
      0x777777,
      () => {
        this.hide();
      }
    );
    this.addChild(this.backButton);
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
    buttonContainer.zIndex = 10;

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
    const usernamePrompt = new UsernamePrompt(
      this.screenWidth,
      this.screenHeight,
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
        // Notify parent (MainScene) to send username to server
        if (this.onUsernameChange) {
          this.onUsernameChange(username);
        }
        // Remove prompt
        this.removeChild(usernamePrompt);
        usernamePrompt.destroy();
      }
    );
    this.addChild(usernamePrompt);
  }

  show(): void {
    // Refresh username from cookie when showing
    this.currentUsername = CookieUtils.get("username") || "";
    // Update username button text
    if (this.usernameChangeButton) {
      const text = this.usernameChangeButton.children.find(
        (child) => child instanceof Text
      ) as Text;
      if (text) {
        text.text = `Vardas: ${this.currentUsername || "Nenustatytas"}`;
      }
    }
    this.visible = true;
    this.isVisible = true;
  }

  hide(): void {
    this.visible = false;
    this.isVisible = false;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
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
    super.destroy();
  }
}
