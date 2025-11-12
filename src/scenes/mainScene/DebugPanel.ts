import { Container, Graphics, Text, TextStyle } from "pixi.js";

export interface DebugSettings {
  botsEnabled: boolean;
  movementSpeed: number; // Multiplier for movement speed
  tankRotationSpeed: number; // Multiplier for tank rotation
  gunRotationSpeed: number; // Multiplier for gun rotation
  gunSpeed: number; // Multiplier for bullet speed
  latency: number; // Simulated latency in milliseconds (0 = disabled)
}

export class DebugPanel extends Container {
  private overlay!: Graphics;
  private modal!: Graphics;
  private titleText!: Text;
  private isVisible: boolean = false;
  private screenWidth: number;
  private screenHeight: number;
  private settings: DebugSettings;
  private onSettingsChange?: (settings: DebugSettings) => void;

  // UI Elements
  private botsToggleButton!: Container;
  private botsToggleText!: Text;
  private speedSlider!: Container;
  private speedValueText!: Text;
  private tankRotSpeedSlider!: Container;
  private tankRotSpeedValueText!: Text;
  private gunRotSpeedSlider!: Container;
  private gunRotSpeedValueText!: Text;
  private gunSpeedSlider!: Container;
  private gunSpeedValueText!: Text;
  private latencySlider!: Container;
  private latencyValueText!: Text;

  constructor(
    screenWidth: number,
    screenHeight: number,
    initialSettings: DebugSettings,
    onSettingsChange?: (settings: DebugSettings) => void
  ) {
    super();
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.settings = { ...initialSettings };
    this.onSettingsChange = onSettingsChange;
    this.zIndex = 100001; // Even higher than menu modal
    this.visible = false;

    this.createPanel();
  }

  private createPanel(): void {
    // Create overlay background
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, this.screenWidth, this.screenHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.8 });
    this.overlay.eventMode = "static";
    this.overlay.cursor = "default";
    this.addChild(this.overlay);

    // Create modal background
    const modalWidth = 500;
    const modalHeight = 600;
    const modalX = (this.screenWidth - modalWidth) / 2;
    const modalY = (this.screenHeight - modalHeight) / 2;

    this.modal = new Graphics();
    this.modal.roundRect(modalX, modalY, modalWidth, modalHeight, 10);
    this.modal.fill(0x1a1a1a);
    this.modal.stroke({ width: 2, color: 0x00ff00 }); // Green border for debug panel
    this.addChild(this.modal);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 32,
      fill: 0x00ff00,
      align: "center",
      fontWeight: "bold",
    });

    this.titleText = new Text({
      text: "DEBUG PANEL",
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = this.screenWidth / 2;
    this.titleText.y = modalY + 30;
    this.addChild(this.titleText);

    let currentY = modalY + 80;

    // Bots Toggle
    this.createToggle(
      "Bots Enabled",
      this.settings.botsEnabled,
      modalX + 20,
      currentY,
      (value) => {
        this.settings.botsEnabled = value;
        this.updateBotsToggle();
        this.onSettingsChange?.(this.settings);
      },
      (button, text) => {
        this.botsToggleButton = button;
        this.botsToggleText = text;
      }
    );
    currentY += 60;

    // Movement Speed Slider
    this.createSlider(
      "Movement Speed",
      this.settings.movementSpeed,
      0.1,
      5.0,
      modalX + 20,
      currentY,
      (value) => {
        this.settings.movementSpeed = value;
        this.updateSpeedSlider();
        this.onSettingsChange?.(this.settings);
      },
      (slider, valueText) => {
        this.speedSlider = slider;
        this.speedValueText = valueText;
      }
    );
    currentY += 60;

    // Tank Rotation Speed Slider
    this.createSlider(
      "Tank Rotation Speed",
      this.settings.tankRotationSpeed,
      0.1,
      5.0,
      modalX + 20,
      currentY,
      (value) => {
        this.settings.tankRotationSpeed = value;
        this.updateTankRotSpeedSlider();
        this.onSettingsChange?.(this.settings);
      },
      (slider, valueText) => {
        this.tankRotSpeedSlider = slider;
        this.tankRotSpeedValueText = valueText;
      }
    );
    currentY += 60;

    // Gun Rotation Speed Slider
    this.createSlider(
      "Gun Rotation Speed",
      this.settings.gunRotationSpeed,
      0.1,
      5.0,
      modalX + 20,
      currentY,
      (value) => {
        this.settings.gunRotationSpeed = value;
        this.updateGunRotSpeedSlider();
        this.onSettingsChange?.(this.settings);
      },
      (slider, valueText) => {
        this.gunRotSpeedSlider = slider;
        this.gunRotSpeedValueText = valueText;
      }
    );
    currentY += 60;

    // Gun Speed Slider
    this.createSlider(
      "Gun Speed (Bullet Speed)",
      this.settings.gunSpeed,
      0.1,
      5.0,
      modalX + 20,
      currentY,
      (value) => {
        this.settings.gunSpeed = value;
        this.updateGunSpeedSlider();
        this.onSettingsChange?.(this.settings);
      },
      (slider, valueText) => {
        this.gunSpeedSlider = slider;
        this.gunSpeedValueText = valueText;
      }
    );
    currentY += 60;

    // Latency Slider
    this.createSlider(
      "Network Latency (ms)",
      this.settings.latency,
      0,
      500,
      modalX + 20,
      currentY,
      (value) => {
        this.settings.latency = value;
        this.updateLatencySlider();
        this.onSettingsChange?.(this.settings);
      },
      (slider, valueText) => {
        this.latencySlider = slider;
        this.latencyValueText = valueText;
      }
    );

    // Close hint
    const hintStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0x888888,
      align: "center",
    });

    const hintText = new Text({
      text: "Press Shift to toggle this panel",
      style: hintStyle,
    });
    hintText.anchor.set(0.5);
    hintText.x = this.screenWidth / 2;
    hintText.y = modalY + modalHeight - 30;
    this.addChild(hintText);
  }

  private createToggle(
    label: string,
    initialValue: boolean,
    x: number,
    y: number,
    onChange: (value: boolean) => void,
    onCreated: (button: Container, text: Text) => void
  ): void {
    const labelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "left",
    });

    const labelText = new Text({
      text: label,
      style: labelStyle,
    });
    labelText.x = x;
    labelText.y = y;
    this.addChild(labelText);

    const buttonContainer = new Container();
    buttonContainer.x = x + 300;
    buttonContainer.y = y;
    buttonContainer.eventMode = "static";
    buttonContainer.cursor = "pointer";
    buttonContainer.zIndex = 10;

    const button = new Graphics();
    const buttonWidth = 80;
    const buttonHeight = 30;
    button.roundRect(0, 0, buttonWidth, buttonHeight, 5);
    button.fill(initialValue ? 0x00ff00 : 0x666666);
    button.stroke({ width: 2, color: 0xffffff });
    button.zIndex = 1;

    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
      align: "center",
    });

    const buttonText = new Text({
      text: initialValue ? "ON" : "OFF",
      style: buttonTextStyle,
    });
    buttonText.anchor.set(0.5);
    buttonText.x = buttonWidth / 2;
    buttonText.y = buttonHeight / 2;
    buttonText.zIndex = 2;

    buttonContainer.addChild(button);
    buttonContainer.addChild(buttonText);

    buttonContainer.on("pointerdown", () => {
      const newValue = !initialValue;
      onChange(newValue);
    });

    this.addChild(buttonContainer);
    onCreated(buttonContainer, buttonText);
  }

  private createSlider(
    label: string,
    initialValue: number,
    min: number,
    max: number,
    x: number,
    y: number,
    onChange: (value: number) => void,
    onCreated: (slider: Container, valueText: Text) => void
  ): void {
    const labelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "left",
    });

    const labelText = new Text({
      text: label,
      style: labelStyle,
    });
    labelText.x = x;
    labelText.y = y;
    this.addChild(labelText);

    const sliderContainer = new Container();
    sliderContainer.x = x;
    sliderContainer.y = y + 25;
    sliderContainer.eventMode = "static";
    sliderContainer.cursor = "pointer";

    const sliderWidth = 300;
    const sliderHeight = 20;
    const trackHeight = 6;

    // Track background
    const trackBg = new Graphics();
    trackBg.roundRect(
      0,
      (sliderHeight - trackHeight) / 2,
      sliderWidth,
      trackHeight,
      3
    );
    trackBg.fill(0x333333);
    trackBg.stroke({ width: 1, color: 0x666666 });
    sliderContainer.addChild(trackBg);

    // Track fill (current value indicator)
    const trackFill = new Graphics();
    const fillWidth = (initialValue / max) * sliderWidth;
    trackFill.roundRect(
      0,
      (sliderHeight - trackHeight) / 2,
      fillWidth,
      trackHeight,
      3
    );
    trackFill.fill(0x00ff00);
    sliderContainer.addChild(trackFill);

    // Handle
    const handle = new Graphics();
    const handleSize = 16;
    const handleX = (initialValue / max) * sliderWidth;
    handle.circle(handleX, sliderHeight / 2, handleSize / 2);
    handle.fill(0xffffff);
    handle.stroke({ width: 2, color: 0x00ff00 });
    sliderContainer.addChild(handle);

    // Value text
    const valueStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 16,
      fill: 0x00ff00,
      align: "right",
    });

    const valueText = new Text({
      text: initialValue.toFixed(2),
      style: valueStyle,
    });
    valueText.anchor.set(1, 0);
    valueText.x = sliderWidth + 10;
    valueText.y = 0;
    sliderContainer.addChild(valueText);

    let isDragging = false;

    const updateSlider = (clientX: number) => {
      const globalPos = sliderContainer.getGlobalPosition();
      const localX = clientX - globalPos.x;
      const normalizedValue = Math.max(0, Math.min(1, localX / sliderWidth));
      const newValue = min + normalizedValue * (max - min);
      onChange(newValue);
    };

    sliderContainer.on("pointerdown", (e) => {
      isDragging = true;
      const globalPos = e.global;
      updateSlider(globalPos.x);
    });

    window.addEventListener("pointermove", (e) => {
      if (isDragging) {
        const globalPos = sliderContainer.getGlobalPosition();
        const localX = e.clientX - globalPos.x;
        const normalizedValue = Math.max(0, Math.min(1, localX / sliderWidth));
        const newValue = min + normalizedValue * (max - min);
        onChange(newValue);
      }
    });

    window.addEventListener("pointerup", () => {
      isDragging = false;
    });

    this.addChild(sliderContainer);
    onCreated(sliderContainer, valueText);
  }

  private updateBotsToggle(): void {
    if (this.botsToggleButton && this.botsToggleText) {
      const button = this.botsToggleButton.children[0] as Graphics;
      button.clear();
      button.roundRect(0, 0, 80, 30, 5);
      button.fill(this.settings.botsEnabled ? 0x00ff00 : 0x666666);
      button.stroke({ width: 2, color: 0xffffff });
      this.botsToggleText.text = this.settings.botsEnabled ? "ON" : "OFF";
    }
  }

  private updateSpeedSlider(): void {
    this.updateSlider(
      this.speedSlider,
      this.speedValueText,
      this.settings.movementSpeed,
      0.1,
      5.0
    );
  }

  private updateTankRotSpeedSlider(): void {
    this.updateSlider(
      this.tankRotSpeedSlider,
      this.tankRotSpeedValueText,
      this.settings.tankRotationSpeed,
      0.1,
      5.0
    );
  }

  private updateGunRotSpeedSlider(): void {
    this.updateSlider(
      this.gunRotSpeedSlider,
      this.gunRotSpeedValueText,
      this.settings.gunRotationSpeed,
      0.1,
      5.0
    );
  }

  private updateGunSpeedSlider(): void {
    this.updateSlider(
      this.gunSpeedSlider,
      this.gunSpeedValueText,
      this.settings.gunSpeed,
      0.1,
      5.0
    );
  }

  private updateLatencySlider(): void {
    this.updateSlider(
      this.latencySlider,
      this.latencyValueText,
      this.settings.latency,
      0,
      500
    );
  }

  private updateSlider(
    slider: Container,
    valueText: Text,
    value: number,
    min: number,
    max: number
  ): void {
    if (!slider || !valueText) return;

    const sliderWidth = 300;
    const sliderHeight = 20;
    const trackHeight = 6;

    // Update track fill
    const trackFill = slider.children[1] as Graphics;
    const fillWidth = ((value - min) / (max - min)) * sliderWidth;
    trackFill.clear();
    trackFill.roundRect(
      0,
      (sliderHeight - trackHeight) / 2,
      fillWidth,
      trackHeight,
      3
    );
    trackFill.fill(0x00ff00);

    // Update handle position
    const handle = slider.children[2] as Graphics;
    const handleSize = 16;
    const handleX = ((value - min) / (max - min)) * sliderWidth;
    handle.clear();
    handle.circle(handleX, sliderHeight / 2, handleSize / 2);
    handle.fill(0xffffff);
    handle.stroke({ width: 2, color: 0x00ff00 });

    // Update value text
    valueText.text = value.toFixed(2);
  }

  show(): void {
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

  getSettings(): DebugSettings {
    return { ...this.settings };
  }

  destroy(): void {
    window.removeEventListener("pointermove", () => {});
    window.removeEventListener("pointerup", () => {});
    this.removeChildren();
    super.destroy();
  }
}
