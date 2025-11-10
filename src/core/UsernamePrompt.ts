import { Container, Graphics, Text, TextStyle } from "pixi.js";

export class UsernamePrompt extends Container {
  private inputElement: HTMLInputElement;
  private callback: (username: string) => void;
  private overlay: Graphics;
  private titleText: Text;
  private button: Graphics;
  private buttonText: Text;
  private buttonContainer: Container;

  constructor(
    screenWidth: number,
    screenHeight: number,
    defaultUsername: string = "",
    onConfirm: (username: string) => void
  ) {
    super();
    this.callback = onConfirm;
    this.zIndex = 100000; // Very high z-index to be on top

    // Create overlay background
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, screenWidth, screenHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.addChild(this.overlay);

    // Create modal background
    const modalWidth = 400;
    const modalHeight = 200;
    const modalX = (screenWidth - modalWidth) / 2;
    const modalY = (screenHeight - modalHeight) / 2;

    const modal = new Graphics();
    modal.roundRect(modalX, modalY, modalWidth, modalHeight, 10);
    modal.fill(0x2a2a2a);
    modal.stroke({ width: 2, color: 0xffffff });
    this.addChild(modal);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
      align: "center",
    });

    this.titleText = new Text({
      text: "Enter Your Username",
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = screenWidth / 2;
    this.titleText.y = modalY + 40;
    this.addChild(this.titleText);

    // Create HTML input element
    this.inputElement = document.createElement("input");
    this.inputElement.type = "text";
    this.inputElement.value = defaultUsername;
    this.inputElement.placeholder = "Username";
    this.inputElement.maxLength = 20;
    this.inputElement.style.position = "absolute";
    this.inputElement.style.left = `${modalX + 50}px`;
    this.inputElement.style.top = `${modalY + 80}px`;
    this.inputElement.style.width = `${modalWidth - 100}px`;
    this.inputElement.style.height = "40px";
    this.inputElement.style.padding = "0 10px";
    this.inputElement.style.fontSize = "18px";
    this.inputElement.style.border = "2px solid #ffffff";
    this.inputElement.style.borderRadius = "5px";
    this.inputElement.style.backgroundColor = "#1a1a1a";
    this.inputElement.style.color = "#ffffff";
    this.inputElement.style.outline = "none";
    document.body.appendChild(this.inputElement);

    // Focus input
    setTimeout(() => this.inputElement.focus(), 100);

    // Handle Enter key
    this.inputElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.confirm();
      }
    });

    // Create button
    this.buttonContainer = new Container();
    this.buttonContainer.x = screenWidth / 2;
    this.buttonContainer.y = modalY + 140;
    this.buttonContainer.eventMode = "static";
    this.buttonContainer.cursor = "pointer";
    this.buttonContainer.zIndex = 10;

    this.button = new Graphics();
    this.button.roundRect(-60, -20, 120, 40, 8);
    this.button.fill(0x4a90e2);
    this.button.stroke({ width: 2, color: 0xffffff });
    this.button.zIndex = 1;

    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "center",
    });

    this.buttonText = new Text({
      text: "Confirm",
      style: buttonTextStyle,
    });
    this.buttonText.anchor.set(0.5);
    this.buttonText.zIndex = 2;

    this.buttonContainer.addChild(this.button);
    this.buttonContainer.addChild(this.buttonText);
    this.addChild(this.buttonContainer);

    // Button hover effects
    this.buttonContainer.on("pointerenter", () => {
      this.button.clear();
      this.button.roundRect(-60, -20, 120, 40, 8);
      this.button.fill(0x5aa0f2);
      this.button.stroke({ width: 2, color: 0xffffff });
    });

    this.buttonContainer.on("pointerleave", () => {
      this.button.clear();
      this.button.roundRect(-60, -20, 120, 40, 8);
      this.button.fill(0x4a90e2);
      this.button.stroke({ width: 2, color: 0xffffff });
    });

    this.buttonContainer.on("pointerdown", () => {
      this.confirm();
    });
  }

  private confirm(): void {
    const username = this.inputElement.value.trim();
    if (username.length === 0) {
      alert("Please enter a username");
      return;
    }
    if (username.length > 20) {
      alert("Username must be 20 characters or less");
      return;
    }
    // Remove input element
    document.body.removeChild(this.inputElement);
    // Call callback
    this.callback(username);
  }

  destroy(): void {
    // Clean up input element if still exists
    if (this.inputElement && this.inputElement.parentNode) {
      document.body.removeChild(this.inputElement);
    }
    this.removeChildren();
    super.destroy();
  }
}
