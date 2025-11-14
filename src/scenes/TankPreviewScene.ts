import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { Scene } from "./Scene";
import { SceneManager } from "../core/SceneManager";
import { TankConfigRegistry } from "../core/tanks/TankConfig";
import { Tank1, Tank1Sprites } from "../core/tanks/Tank1";
import { SignInScene } from "./SignInScene";

interface TankPreviewData {
  tank: Tank1Sprites;
  anchorDot: Graphics;
  gunPivot: Container; // Pivot container for gun rotation
  baseId: string;
  gunId: string;
  baseName: string;
  gunName: string;
  initialY: number;
  currentYOffset: number;
  xOffset: number; // Gun sprite X position within pivot container
  yOffset: number; // Gun sprite Y position within pivot container
  tankContainerX: number;
  tankContainerY: number;
}

export class TankPreviewScene extends Scene {
  private background!: Graphics;
  private titleText!: Text;
  private backButton!: Container;
  private exportButton!: Container;
  private spriteModeButton!: Container;
  private anchorModeButton!: Container;
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private tankContainers: Container[] = [];
  private scrollContainer!: Container;
  private scrollY: number = 0;
  private wheelHandler!: (e: WheelEvent) => void;
  private tankPreviews: TankPreviewData[] = [];
  private selectedPreview: TankPreviewData | null = null;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartXOffset: number = 0;
  private dragStartYOffset: number = 0;
  private dragMode: "sprite" | "anchor" | null = null; // Current drag mode
  private keys: Set<string> = new Set(); // Track pressed keys
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 }; // Track mouse position
  private movementSpeed: number = 2; // Pixels per frame

  async initialize(): Promise<void> {
    const app = window.app;
    this.screenWidth = app.screen.width;
    this.screenHeight = app.screen.height;

    // Create background
    this.background = new Graphics();
    this.background.rect(0, 0, this.screenWidth, this.screenHeight);
    this.background.fill(0x1a1a1a);
    this.addChild(this.background);

    // Create title
    const titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 36,
      fill: 0xffffff,
      align: "center",
      fontWeight: "bold",
    });
    this.titleText = new Text({
      text: "TANK PREVIEW - All Combinations",
      style: titleStyle,
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = this.screenWidth / 2;
    this.titleText.y = 30;
    this.addChild(this.titleText);

    // Create scrollable container
    this.scrollContainer = new Container();
    this.addChild(this.scrollContainer);

    // Create back button
    this.createBackButton();

    // Create export button
    this.createExportButton();

    // Create mode toggle buttons
    this.createModeButtons();

    // Load and display all tank combinations
    await this.createAllTankPreviews();

    // Setup mouse wheel scrolling
    this.setupScrolling();

    // Setup drag handlers
    this.setupDragHandlers();

    // Setup keyboard and mouse input
    this.setupInputHandlers();
  }

  private createBackButton(): void {
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonCorner = 8;

    const buttonGraphics = new Graphics();
    buttonGraphics.roundRect(0, 0, buttonWidth, buttonHeight, buttonCorner);
    buttonGraphics.fill(0x666666);
    buttonGraphics.stroke({ width: 2, color: 0xffffff });

    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 20,
      fill: 0xffffff,
      align: "center",
    });
    const buttonText = new Text({
      text: "BACK",
      style: buttonTextStyle,
    });
    buttonText.anchor.set(0.5);
    buttonText.x = buttonWidth / 2;
    buttonText.y = buttonHeight / 2;

    this.backButton = new Container();
    this.backButton.addChild(buttonGraphics);
    this.backButton.addChild(buttonText);
    this.backButton.x = 20;
    this.backButton.y = 20;
    this.backButton.eventMode = "static";
    this.backButton.cursor = "pointer";

    this.backButton.on("pointerdown", () => {
      const signInScene = new SignInScene();
      signInScene.initialize();
      SceneManager.changeScene(signInScene);
    });

    this.backButton.on("pointerenter", () => {
      buttonGraphics.clear();
      buttonGraphics.roundRect(0, 0, buttonWidth, buttonHeight, buttonCorner);
      buttonGraphics.fill(0x777777);
      buttonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    this.backButton.on("pointerleave", () => {
      buttonGraphics.clear();
      buttonGraphics.roundRect(0, 0, buttonWidth, buttonHeight, buttonCorner);
      buttonGraphics.fill(0x666666);
      buttonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    this.addChild(this.backButton);
  }

  private createExportButton(): void {
    const buttonWidth = 150;
    const buttonHeight = 50;
    const buttonCorner = 8;

    const buttonGraphics = new Graphics();
    buttonGraphics.roundRect(0, 0, buttonWidth, buttonHeight, buttonCorner);
    buttonGraphics.fill(0x4a90e2);
    buttonGraphics.stroke({ width: 2, color: 0xffffff });

    const buttonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 20,
      fill: 0xffffff,
      align: "center",
    });
    const buttonText = new Text({
      text: "EXPORT",
      style: buttonTextStyle,
    });
    buttonText.anchor.set(0.5);
    buttonText.x = buttonWidth / 2;
    buttonText.y = buttonHeight / 2;

    this.exportButton = new Container();
    this.exportButton.addChild(buttonGraphics);
    this.exportButton.addChild(buttonText);
    this.exportButton.x = this.screenWidth - buttonWidth - 20;
    this.exportButton.y = 20;
    this.exportButton.eventMode = "static";
    this.exportButton.cursor = "pointer";

    this.exportButton.on("pointerdown", () => {
      this.handleExport();
    });

    this.exportButton.on("pointerenter", () => {
      buttonGraphics.clear();
      buttonGraphics.roundRect(0, 0, buttonWidth, buttonHeight, buttonCorner);
      buttonGraphics.fill(0x5aa0f2);
      buttonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    this.exportButton.on("pointerleave", () => {
      buttonGraphics.clear();
      buttonGraphics.roundRect(0, 0, buttonWidth, buttonHeight, buttonCorner);
      buttonGraphics.fill(0x4a90e2);
      buttonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    this.addChild(this.exportButton);
  }

  private createModeButtons(): void {
    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonCorner = 8;
    const buttonSpacing = 10;

    // Sprite Mode Button
    const spriteButtonGraphics = new Graphics();
    spriteButtonGraphics.roundRect(
      0,
      0,
      buttonWidth,
      buttonHeight,
      buttonCorner
    );
    spriteButtonGraphics.fill(0x4a90e2);
    spriteButtonGraphics.stroke({ width: 2, color: 0xffffff });

    const spriteButtonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "center",
      fontWeight: "bold",
    });
    const spriteButtonText = new Text({
      text: "SPRITE MODE",
      style: spriteButtonTextStyle,
    });
    spriteButtonText.anchor.set(0.5);
    spriteButtonText.x = buttonWidth / 2;
    spriteButtonText.y = buttonHeight / 2;

    this.spriteModeButton = new Container();
    this.spriteModeButton.addChild(spriteButtonGraphics);
    this.spriteModeButton.addChild(spriteButtonText);
    this.spriteModeButton.x =
      this.screenWidth / 2 - buttonWidth - buttonSpacing / 2;
    this.spriteModeButton.y = 20;
    this.spriteModeButton.eventMode = "static";
    this.spriteModeButton.cursor = "pointer";

    this.spriteModeButton.on("pointerdown", () => {
      // Toggle: if already in sprite mode, turn off; otherwise set to sprite mode
      this.setGlobalMode(this.dragMode === "sprite" ? null : "sprite");
    });

    this.spriteModeButton.on("pointerenter", () => {
      spriteButtonGraphics.clear();
      spriteButtonGraphics.roundRect(
        0,
        0,
        buttonWidth,
        buttonHeight,
        buttonCorner
      );
      spriteButtonGraphics.fill(0x5aa0f2);
      spriteButtonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    this.spriteModeButton.on("pointerleave", () => {
      const isActive = this.dragMode === "sprite";
      spriteButtonGraphics.clear();
      spriteButtonGraphics.roundRect(
        0,
        0,
        buttonWidth,
        buttonHeight,
        buttonCorner
      );
      spriteButtonGraphics.fill(isActive ? 0x00ff00 : 0x4a90e2);
      spriteButtonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    // Anchor Mode Button
    const anchorButtonGraphics = new Graphics();
    anchorButtonGraphics.roundRect(
      0,
      0,
      buttonWidth,
      buttonHeight,
      buttonCorner
    );
    anchorButtonGraphics.fill(0x4a90e2);
    anchorButtonGraphics.stroke({ width: 2, color: 0xffffff });

    const anchorButtonTextStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      align: "center",
      fontWeight: "bold",
    });
    const anchorButtonText = new Text({
      text: "ANCHOR MODE",
      style: anchorButtonTextStyle,
    });
    anchorButtonText.anchor.set(0.5);
    anchorButtonText.x = buttonWidth / 2;
    anchorButtonText.y = buttonHeight / 2;

    this.anchorModeButton = new Container();
    this.anchorModeButton.addChild(anchorButtonGraphics);
    this.anchorModeButton.addChild(anchorButtonText);
    this.anchorModeButton.x = this.screenWidth / 2 + buttonSpacing / 2;
    this.anchorModeButton.y = 20;
    this.anchorModeButton.eventMode = "static";
    this.anchorModeButton.cursor = "pointer";

    this.anchorModeButton.on("pointerdown", () => {
      // Toggle: if already in anchor mode, turn off; otherwise set to anchor mode
      this.setGlobalMode(this.dragMode === "anchor" ? null : "anchor");
    });

    this.anchorModeButton.on("pointerenter", () => {
      anchorButtonGraphics.clear();
      anchorButtonGraphics.roundRect(
        0,
        0,
        buttonWidth,
        buttonHeight,
        buttonCorner
      );
      anchorButtonGraphics.fill(0x5aa0f2);
      anchorButtonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    this.anchorModeButton.on("pointerleave", () => {
      const isActive = this.dragMode === "anchor";
      anchorButtonGraphics.clear();
      anchorButtonGraphics.roundRect(
        0,
        0,
        buttonWidth,
        buttonHeight,
        buttonCorner
      );
      anchorButtonGraphics.fill(isActive ? 0x0000ff : 0x4a90e2);
      anchorButtonGraphics.stroke({ width: 2, color: 0xffffff });
    });

    // Store graphics references for updating
    (this.spriteModeButton as any).graphics = spriteButtonGraphics;
    (this.anchorModeButton as any).graphics = anchorButtonGraphics;

    this.addChild(this.spriteModeButton);
    this.addChild(this.anchorModeButton);
  }

  private setGlobalMode(mode: "sprite" | "anchor" | null): void {
    this.dragMode = mode;

    // Update all dots to reflect the global mode
    for (const preview of this.tankPreviews) {
      const dot = preview.anchorDot;
      dot.clear();

      if (mode === "sprite") {
        // Green for sprite mode
        dot.circle(0, 0, 10);
        dot.fill(0x00ff00);
        dot.stroke({ width: 3, color: 0xffffff });
        (preview as any).dotState = "green";
      } else if (mode === "anchor") {
        // Blue for anchor mode
        dot.circle(0, 0, 10);
        dot.fill(0x0000ff);
        dot.stroke({ width: 3, color: 0xffffff });
        (preview as any).dotState = "blue";
      } else {
        // Red for no mode
        dot.circle(0, 0, 8);
        dot.fill(0xff0000);
        dot.stroke({ width: 2, color: 0xffffff });
        (preview as any).dotState = "red";
      }
    }

    // Update button appearances
    this.updateModeButtons();
  }

  private updateModeButtons(): void {
    const spriteGraphics = (this.spriteModeButton as any).graphics;
    const anchorGraphics = (this.anchorModeButton as any).graphics;

    if (spriteGraphics) {
      spriteGraphics.clear();
      spriteGraphics.roundRect(0, 0, 180, 50, 8);
      spriteGraphics.fill(this.dragMode === "sprite" ? 0x00ff00 : 0x4a90e2);
      spriteGraphics.stroke({ width: 2, color: 0xffffff });
    }

    if (anchorGraphics) {
      anchorGraphics.clear();
      anchorGraphics.roundRect(0, 0, 180, 50, 8);
      anchorGraphics.fill(this.dragMode === "anchor" ? 0x0000ff : 0x4a90e2);
      anchorGraphics.stroke({ width: 2, color: 0xffffff });
    }
  }

  private async createAllTankPreviews(): Promise<void> {
    const allBases = TankConfigRegistry.getAllTankBases();
    const allGuns = TankConfigRegistry.getAllTankGuns();

    // Filter to unique base types (by name) and unique gun types (by name)
    const uniqueBases = Array.from(
      new Map(allBases.map((b) => [b.name, b])).values()
    );
    const uniqueGuns = Array.from(
      new Map(allGuns.map((g) => [g.name, g])).values()
    );

    const padding = 20;
    const tankSpacing = 250;
    const startX = padding;
    let currentY = 100 + 100; // Add 100px padding from top
    const maxTanksPerRow = Math.floor(
      (this.screenWidth - padding * 2) / tankSpacing
    );

    let tankIndex = 0;

    // Create preview for each base + gun combination
    for (const base of uniqueBases) {
      // Get first color variant of this base
      const baseVariants = allBases.filter((b) => b.name === base.name);
      const baseToUse = baseVariants[0];

      for (const gun of uniqueGuns) {
        // Get first color variant of this gun
        const gunVariants = allGuns.filter((g) => g.name === gun.name);
        const gunToUse = gunVariants[0];

        const x = startX + (tankIndex % maxTanksPerRow) * tankSpacing;
        const y =
          currentY + Math.floor(tankIndex / maxTanksPerRow) * tankSpacing;

        await this.createTankPreview(
          baseToUse.id,
          gunToUse.id,
          x,
          y,
          `${baseToUse.name} + ${gunToUse.name}`
        );

        tankIndex++;
      }

      // Move to next row after all guns for this base
      if (tankIndex % maxTanksPerRow === 0) {
        currentY += tankSpacing;
      }
    }

    // Update scroll container height
    const minHeight = currentY + tankSpacing;
    this.scrollContainer.height = Math.max(minHeight, this.screenHeight);
  }

  private async createTankPreview(
    baseId: string,
    gunId: string,
    x: number,
    y: number,
    label: string
  ): Promise<void> {
    try {
      // Create tank with 0,0 initial position (we'll position the container instead)
      const tank = await Tank1.create({
        baseId: baseId,
        gunId: gunId,
        initialX: 0,
        initialY: 0,
        scale: 1, // Increased from 0.3 for better visibility
      });

      // Position tank container in scroll container
      tank.container.x = x;
      tank.container.y = y;

      // Get configs for names
      const baseConfig = TankConfigRegistry.getTankBase(baseId);
      const gunConfig = TankConfigRegistry.getTankGun(gunId);
      const baseName = baseConfig?.name ?? baseId;
      const gunName = gunConfig?.name ?? gunId;

      // Get gun Y offset from config if needed
      const gunYOffset = gunConfig?.gunYOffset ?? 0;

      // Create gun pivot container for rotation control
      // The pivot container's origin (0,0) is where rotation happens
      const gunPivot = new Container();

      // Position pivot container at the gun sprite's anchor point
      // Gun container is at (0, 0) in tank container (since initialX=0, initialY=0)
      // Gun sprite is at (0, gunYOffset) in gun container (after offset applied in Tank1)
      // Anchor point (0.5, 0.2) is at the sprite's position, so it's at (0, gunYOffset) in gun container
      // We position pivot at (0, gunYOffset) relative to tank container to align with anchor point
      gunPivot.x = tank.gun.container.x;
      gunPivot.y = tank.gun.container.y + gunYOffset;

      // Remove gun container from tank and add to pivot
      tank.container.removeChild(tank.gun.container);
      gunPivot.addChild(tank.gun.container);

      // Add pivot container to tank
      tank.container.addChild(gunPivot);

      // Gun sprite already has anchor (0.5, 0.2) set in TankGunFactory
      // The gun sprite is at (0, gunYOffset) in the gun container
      // The pivot is positioned at (0, gunYOffset) relative to tank container
      // When gun container is moved into pivot, it's at (0, 0) in pivot space
      // So gun sprite is at (0, gunYOffset) in pivot space
      // To align anchor point with pivot origin, move sprite to (0, 0) in pivot space
      // This compensates for the pivot being offset
      tank.gun.gun.x = 0;
      tank.gun.gun.y = 0; // Anchor point will be at pivot origin (0, 0)
      if (tank.gun.gunBase) {
        tank.gun.gunBase.x = 0;
        tank.gun.gunBase.y = 0;
      }
      if (tank.gun.fireAnimation) {
        tank.gun.fireAnimation.x = 0;
        tank.gun.fireAnimation.y = 0;
      }

      // Add tank to scroll container
      this.scrollContainer.addChild(tank.container);
      this.tankContainers.push(tank.container);

      // Calculate pivot position relative to scroll container
      const tankContainerX = x;
      const tankContainerY = y;
      const pivotX = tankContainerX + gunPivot.x;
      const pivotY = tankContainerY + gunPivot.y;

      // Create red dot at gun pivot point (pivot container origin)
      const gunAnchorDot = new Graphics();
      gunAnchorDot.circle(0, 0, 8);
      gunAnchorDot.fill(0xff0000); // Red dot (default state)
      gunAnchorDot.stroke({ width: 2, color: 0xffffff });
      gunAnchorDot.x = pivotX;
      gunAnchorDot.y = pivotY;
      gunAnchorDot.zIndex = 1000; // Always on top
      gunAnchorDot.eventMode = "static";
      gunAnchorDot.cursor = "pointer";

      // Add to scroll container at the same level as tank container
      this.scrollContainer.addChild(gunAnchorDot);

      // Store preview data first
      const previewData: TankPreviewData = {
        tank: tank,
        anchorDot: gunAnchorDot,
        gunPivot: gunPivot,
        baseId: baseId,
        gunId: gunId,
        baseName: baseName,
        gunName: gunName,
        initialY: 0,
        currentYOffset: 0,
        xOffset: 0,
        yOffset: 0,
        tankContainerX: tankContainerX,
        tankContainerY: tankContainerY,
      };

      // Create red outline for gun sprite bounds
      const gunBoundsOutline = new Graphics();
      const updateGunBounds = () => {
        gunBoundsOutline.clear();
        // Get bounds in the gun container's local space
        // We need to get the bounds of the gun sprite relative to the gun container
        const gunSprite = tank.gun.gun;

        // Get the sprite's texture dimensions
        const textureWidth = gunSprite.texture.width;
        const textureHeight = gunSprite.texture.height;

        // Get scale
        const scaleX = gunSprite.scale.x;
        const scaleY = gunSprite.scale.y;

        // Calculate scaled dimensions
        const scaledWidth = textureWidth * scaleX;
        const scaledHeight = textureHeight * scaleY;

        // Get anchor point
        const anchorX = gunSprite.anchor.x;
        const anchorY = gunSprite.anchor.y;

        // Calculate the actual bounds in container space
        // When anchor is (0, 0.5), the sprite's position is at left-center
        // The bounds start at: position - (anchor * scaledSize)
        const boundsX = gunSprite.x - anchorX * scaledWidth;
        const boundsY = gunSprite.y - anchorY * scaledHeight;

        // Draw rectangle at the correct position with scaled dimensions
        gunBoundsOutline.rect(boundsX, boundsY, scaledWidth, scaledHeight);
        gunBoundsOutline.stroke({ width: 2, color: 0xff0000 }); // Red outline
      };
      updateGunBounds();
      gunBoundsOutline.zIndex = 999; // Just below anchor dot
      // Add to gun container so it moves with the gun
      tank.gun.container.addChild(gunBoundsOutline);
      // Store update function for later
      (previewData as any).updateGunBounds = updateGunBounds;
      // Store reference to gunBoundsOutline for cleanup if needed
      (previewData as any).gunBoundsOutline = gunBoundsOutline;

      this.tankPreviews.push(previewData);

      // Make anchor draggable
      gunAnchorDot.on("pointerdown", (e) => {
        this.selectPreview(previewData);
        // Only start dragging if in sprite or anchor mode
        if (this.dragMode) {
          // Get screen Y coordinate from the native event
          const nativeEvent = e.data.originalEvent;
          let screenY: number;
          if (nativeEvent && "clientY" in nativeEvent) {
            screenY = (nativeEvent as unknown as { clientY: number }).clientY;
          } else {
            screenY = e.global.y;
          }
          this.startDrag(screenY, previewData);
        }
        e.stopPropagation();
      });

      // Initialize dot state based on current global mode
      this.updateDotForMode(previewData);

      // Create label
      const labelStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: 12,
        fill: 0xffffff,
        align: "center",
      });
      const labelText = new Text({
        text: label,
        style: labelStyle,
      });
      labelText.anchor.set(0.5);
      labelText.x = x;
      labelText.y = y + 80;
      this.scrollContainer.addChild(labelText);

      // Create info text showing offsets and pivot position
      const infoStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: 10,
        fill: 0xaaaaaa,
        align: "center",
      });
      const infoText = new Text({
        text: `${baseName} + ${gunName}`,
        style: infoStyle,
      });
      infoText.anchor.set(0.5);
      infoText.x = x;
      infoText.y = y + 95;
      this.scrollContainer.addChild(infoText);

      // Store info text reference for updating
      (previewData as any).infoText = infoText;
    } catch (error) {
      console.error(
        `Failed to create tank preview for ${baseId} + ${gunId}:`,
        error
      );
    }
  }

  private setupScrolling(): void {
    const app = window.app;
    this.wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      this.scrollY += e.deltaY * 0.5;
      this.scrollY = Math.max(
        0,
        Math.min(this.scrollY, this.scrollContainer.height - this.screenHeight)
      );
      this.scrollContainer.y = -this.scrollY;

      // Update mouse position to account for scroll change
      // Y needs to be recalculated based on current scroll
      // Get the last known mouse client Y and recalculate
      const rect = app.canvas.getBoundingClientRect();
      if ((this as any).lastMouseClientY !== undefined) {
        this.mousePosition.y =
          (this as any).lastMouseClientY - rect.top + this.scrollY;
      }
    };
    app.canvas.addEventListener("wheel", this.wheelHandler);
  }

  private selectPreview(preview: TankPreviewData): void {
    // If clicking the same preview, deselect it
    if (this.selectedPreview === preview) {
      // Deselect - keep global mode but unselect this preview
      this.selectedPreview = null;
      // Update dot to reflect global mode
      this.updateDotForMode(preview);
      return;
    }

    // Deselect previous preview
    if (this.selectedPreview) {
      this.updateDotForMode(this.selectedPreview);
    }

    // Select new preview
    this.selectedPreview = preview;
    // Update dot to show it's selected (slightly larger, with highlight)
    this.updateDotForMode(preview, true);
  }

  private updateDotForMode(
    preview: TankPreviewData,
    isSelected: boolean = false
  ): void {
    const dot = preview.anchorDot;
    dot.clear();

    const size = isSelected ? 12 : 10;
    const strokeWidth = isSelected ? 4 : 3;

    if (this.dragMode === "sprite") {
      // Green for sprite mode
      dot.circle(0, 0, size);
      dot.fill(0x00ff00);
      dot.stroke({ width: strokeWidth, color: 0xffffff });
      (preview as any).dotState = "green";
    } else if (this.dragMode === "anchor") {
      // Blue for anchor mode
      dot.circle(0, 0, size);
      dot.fill(0x0000ff);
      dot.stroke({ width: strokeWidth, color: 0xffffff });
      (preview as any).dotState = "blue";
    } else {
      // Red for no mode
      dot.circle(0, 0, isSelected ? 10 : 8);
      dot.fill(0xff0000);
      dot.stroke({ width: isSelected ? 3 : 2, color: 0xffffff });
      (preview as any).dotState = "red";
    }
  }

  private startDrag(globalY: number, preview: TankPreviewData): void {
    this.isDragging = true;
    this.dragStartY = globalY;
    this.dragStartXOffset = preview.xOffset;
    this.dragStartYOffset = preview.yOffset;
    // Store initial pivot Y position for anchor mode
    (preview as any).initialPivotY = preview.gunPivot.y;
  }

  private setupDragHandlers(): void {
    const app = window.app;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging || !this.selectedPreview || !this.dragMode) return;

      // Get mouse position in screen coordinates
      const mouseY = e.clientY;
      const deltaY = mouseY - this.dragStartY;

      const tank = this.selectedPreview.tank;

      if (this.dragMode === "sprite") {
        // SPRITE MODE: Move the gun sprite within the pivot container
        const newYOffset = this.dragStartYOffset + deltaY;
        const newXOffset = this.dragStartXOffset;

        // Update gun sprite positions within gun container
        tank.gun.gun.x = newXOffset;
        tank.gun.gun.y = newYOffset;

        if (tank.gun.gunBase) {
          tank.gun.gunBase.x = newXOffset;
          tank.gun.gunBase.y = newYOffset;
        }

        if (tank.gun.fireAnimation) {
          tank.gun.fireAnimation.x = newXOffset;
          tank.gun.fireAnimation.y = newYOffset;
        }

        // Update preview data
        this.selectedPreview.xOffset = newXOffset;
        this.selectedPreview.yOffset = newYOffset;

        // Update gun bounds outline
        const updateGunBounds = (this.selectedPreview as any).updateGunBounds;
        if (updateGunBounds) {
          updateGunBounds();
        }

        // Update anchor dot position to follow the pivot point (pivot container origin)
        const tankContainerX = this.selectedPreview.tankContainerX;
        const tankContainerY = this.selectedPreview.tankContainerY;
        const pivotX = tankContainerX + this.selectedPreview.gunPivot.x;
        const pivotY = tankContainerY + this.selectedPreview.gunPivot.y;

        this.selectedPreview.anchorDot.x = pivotX;
        this.selectedPreview.anchorDot.y = pivotY;
      } else if (this.dragMode === "anchor") {
        // ANCHOR MODE: Move the pivot container (anchor point) Y position
        const initialPivotY =
          (this.selectedPreview as any).initialPivotY ??
          this.selectedPreview.gunPivot.y;
        if (!(this.selectedPreview as any).initialPivotY) {
          (this.selectedPreview as any).initialPivotY =
            this.selectedPreview.gunPivot.y;
        }

        // Move pivot container Y by the delta
        this.selectedPreview.gunPivot.y = initialPivotY + deltaY;

        // Compensate gun sprite position: when pivot moves, gun should move opposite to stay visually in place
        const compensatedYOffset = this.dragStartYOffset - deltaY;

        // Update gun sprite positions to compensate for pivot movement
        tank.gun.gun.x = this.dragStartXOffset;
        tank.gun.gun.y = compensatedYOffset;

        if (tank.gun.gunBase) {
          tank.gun.gunBase.x = this.dragStartXOffset;
          tank.gun.gunBase.y = compensatedYOffset;
        }

        if (tank.gun.fireAnimation) {
          tank.gun.fireAnimation.x = this.dragStartXOffset;
          tank.gun.fireAnimation.y = compensatedYOffset;
        }

        // Update gun bounds outline
        const updateGunBounds = (this.selectedPreview as any).updateGunBounds;
        if (updateGunBounds) {
          updateGunBounds();
        }

        // Update anchor dot position to follow the new pivot point
        const tankContainerX = this.selectedPreview.tankContainerX;
        const tankContainerY = this.selectedPreview.tankContainerY;
        const pivotX = tankContainerX + this.selectedPreview.gunPivot.x;
        const pivotY = tankContainerY + this.selectedPreview.gunPivot.y;

        this.selectedPreview.anchorDot.x = pivotX;
        this.selectedPreview.anchorDot.y = pivotY;
      }

      // Update info text
      const infoText = (this.selectedPreview as any).infoText as Text;
      if (infoText) {
        const modeText = this.dragMode === "sprite" ? "SPRITE" : "ANCHOR";
        infoText.text = `[${modeText}] X: ${this.selectedPreview.xOffset.toFixed(1)} | Y: ${this.selectedPreview.yOffset.toFixed(1)}`;
      }
    };

    const onMouseUp = () => {
      this.isDragging = false;
    };

    app.canvas.addEventListener("mousemove", onMouseMove);
    app.canvas.addEventListener("mouseup", onMouseUp);
    app.canvas.addEventListener("mouseleave", onMouseUp);

    // Store handlers for cleanup
    (this as any).dragHandlers = { onMouseMove, onMouseUp };
  }

  private handleExport(): void {
    // Export all tank previews
    const allExports: any[] = [];

    for (const preview of this.tankPreviews) {
      const baseConfig = TankConfigRegistry.getTankBase(preview.baseId);
      const gunConfig = TankConfigRegistry.getTankGun(preview.gunId);

      // Get sprite name from texture URL
      const spriteName =
        baseConfig?.baseTextureUrl.split("/").pop()?.replace(".png", "") ??
        "unknown";
      const gunName = preview.gunName;
      const xOffset = preview.xOffset;
      const yPivotOffset = preview.yOffset;
      const baseSpeed = baseConfig?.speed ?? 1.0;
      const gunRange = gunConfig?.range ?? 1000;
      const gunFireRate = gunConfig?.fireRate ?? 2;
      const gunDamage = gunConfig?.damage ?? 10;
      const gunBulletSpeed = gunConfig?.bulletSpeed ?? 1.0;

      // Create export data for this tank combination
      const exportData = {
        spriteName: spriteName,
        gunName: gunName,
        baseId: preview.baseId,
        gunId: preview.gunId,
        baseName: preview.baseName,
        baseConfig: {
          speed: baseSpeed,
        },
        gunConfig: {
          range: gunRange,
          fireRate: gunFireRate,
          damage: gunDamage,
          bulletSpeed: gunBulletSpeed,
          pivotOffset: {
            x: parseFloat(xOffset.toFixed(1)),
            y: parseFloat(yPivotOffset.toFixed(1)),
          },
        },
      };

      allExports.push(exportData);
    }

    // Create final export object with all tank combinations
    const finalExport = {
      exportDate: new Date().toISOString(),
      totalCombinations: allExports.length,
      tankCombinations: allExports,
    };

    // Display in console
    console.log("=== EXPORT DATA (ALL TANKS) ===");
    console.log(JSON.stringify(finalExport, null, 2));
    console.log("===============================");

    // Copy to clipboard
    const exportString = JSON.stringify(finalExport, null, 2);
    navigator.clipboard
      .writeText(exportString)
      .then(() => {
        alert(
          `All Tank Data Exported!\n\nTotal Combinations: ${allExports.length}\n\nData copied to clipboard and logged to console.`
        );
      })
      .catch(() => {
        // Fallback if clipboard API fails
        alert(`Export Data:\n\n${exportString}\n\n(Also logged to console)`);
      });
  }

  private setupInputHandlers(): void {
    const app = window.app;

    // Keyboard input
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };

    // Mouse position tracking
    const onMouseMove = (e: MouseEvent) => {
      // Get mouse position relative to the canvas
      const rect = app.canvas.getBoundingClientRect();
      // Store client Y for scroll recalculation
      (this as any).lastMouseClientY = e.clientY;
      // Convert to scroll container space (account for scroll offset)
      this.mousePosition.x = e.clientX - rect.left;
      this.mousePosition.y = e.clientY - rect.top + this.scrollY;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    app.canvas.addEventListener("mousemove", onMouseMove);

    // Store handlers for cleanup
    (this as any).inputHandlers = { onKeyDown, onKeyUp, onMouseMove };
  }

  update(deltaTime: number): void {
    // Handle movement for all tanks
    this.updateTankMovement(deltaTime);

    // Handle gun rotation for all tanks
    this.updateGunRotation();
  }

  private updateTankMovement(deltaTime: number): void {
    // Check for movement keys
    const wDown = this.keys.has("KeyW");
    const sDown = this.keys.has("KeyS");
    const aDown = this.keys.has("KeyA");
    const dDown = this.keys.has("KeyD");

    // Calculate movement direction
    let moveX = 0;
    let moveY = 0;

    if (wDown) moveY -= 1;
    if (sDown) moveY += 1;
    if (aDown) moveX -= 1;
    if (dDown) moveX += 1;

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707; // 1/sqrt(2) for diagonal normalization
      moveY *= 0.707;
    }

    // Apply movement to all tank containers
    const moveSpeed = this.movementSpeed * deltaTime;
    for (const preview of this.tankPreviews) {
      preview.tank.container.x += moveX * moveSpeed;
      preview.tank.container.y += moveY * moveSpeed;

      // Update stored container positions
      preview.tankContainerX = preview.tank.container.x;
      preview.tankContainerY = preview.tank.container.y;

      // Update anchor dot position
      const pivotX = preview.tankContainerX + preview.gunPivot.x;
      const pivotY = preview.tankContainerY + preview.gunPivot.y;
      preview.anchorDot.x = pivotX;
      preview.anchorDot.y = pivotY;
    }
  }

  private updateGunRotation(): void {
    // Rotate all gun pivots to point at mouse
    for (const preview of this.tankPreviews) {
      // Get pivot position in scroll container space
      // The tank container is positioned in scroll container, and pivot is relative to tank container
      const pivotScreenX = preview.tankContainerX + preview.gunPivot.x;
      const pivotScreenY = preview.tankContainerY + preview.gunPivot.y;

      // Calculate angle to mouse (mouse position is already in scroll container space)
      const dx = this.mousePosition.x - pivotScreenX;
      const dy = this.mousePosition.y - pivotScreenY;

      // Only rotate if mouse is not too close (avoid jitter)
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 5) continue;

      // Compute angle (PixiJS rotation: 0 points up, atan2: 0 points right)
      // So we subtract Math.PI/2 to convert from atan2 to PixiJS rotation
      const angle = Math.atan2(dy, dx) - Math.PI / 2;

      // Apply rotation to gun pivot container
      preview.gunPivot.rotation = angle;
    }
  }

  destroy(): void {
    // Clean up
    if (this.backButton) {
      this.backButton.off("pointerdown");
      this.backButton.off("pointerenter");
      this.backButton.off("pointerleave");
    }

    if (this.exportButton) {
      this.exportButton.off("pointerdown");
      this.exportButton.off("pointerenter");
      this.exportButton.off("pointerleave");
    }

    // Remove scroll event listener
    const app = window.app;
    if (this.wheelHandler) {
      app.canvas.removeEventListener("wheel", this.wheelHandler);
    }

    // Remove drag handlers
    const dragHandlers = (this as any).dragHandlers;
    if (dragHandlers) {
      app.canvas.removeEventListener("mousemove", dragHandlers.onMouseMove);
      app.canvas.removeEventListener("mouseup", dragHandlers.onMouseUp);
      app.canvas.removeEventListener("mouseleave", dragHandlers.onMouseUp);
    }

    // Remove input handlers
    const inputHandlers = (this as any).inputHandlers;
    if (inputHandlers) {
      window.removeEventListener("keydown", inputHandlers.onKeyDown);
      window.removeEventListener("keyup", inputHandlers.onKeyUp);
      app.canvas.removeEventListener("mousemove", inputHandlers.onMouseMove);
    }

    // Destroy all tank containers
    this.tankContainers.forEach((container) => {
      container.destroy({ children: true });
    });

    // Clear preview data
    this.tankPreviews = [];
    this.selectedPreview = null;

    this.removeChildren();
  }
}
