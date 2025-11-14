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

    // Load and display all tank combinations
    await this.createAllTankPreviews();

    // Setup mouse wheel scrolling
    this.setupScrolling();

    // Setup drag handlers
    this.setupDragHandlers();
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
    let currentY = 100;
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
        scale: 0.3,
      });

      // Position tank container in scroll container
      tank.container.x = x;
      tank.container.y = y;

      // Get configs for names
      const baseConfig = TankConfigRegistry.getTankBase(baseId);
      const gunConfig = TankConfigRegistry.getTankGun(gunId);
      const baseName = baseConfig?.name ?? baseId;
      const gunName = gunConfig?.name ?? gunId;

      // Get initial offsets
      const baseOffset = TankConfigRegistry.getGunYOffsetForBase(baseId, gunId);
      const gunOffset = gunConfig?.gunYOffset ?? 0;
      const totalOffset = baseOffset + gunOffset;

      // Create gun pivot container for rotation control
      // The pivot container's origin (0,0) is where rotation happens
      const gunPivot = new Container();

      // Position pivot container where we want the rotation point
      // Initially at the gun's position (center of tank)
      gunPivot.x = tank.gun.container.x;
      gunPivot.y = tank.gun.container.y + totalOffset;

      // Remove gun container from tank and add to pivot
      tank.container.removeChild(tank.gun.container);
      gunPivot.addChild(tank.gun.container);

      // Add pivot container to tank
      tank.container.addChild(gunPivot);

      // Set gun sprite anchor to (0, 0.5) for left-center rotation
      tank.gun.gun.anchor.set(0, 0.5);
      if (tank.gun.gunBase) {
        tank.gun.gunBase.anchor.set(0, 0.5);
      }
      if (tank.gun.fireAnimation) {
        tank.gun.fireAnimation.anchor.set(0, 0.5);
      }

      // Position gun sprites within gun container to align pivot point
      // Initially center the gun horizontally, no vertical offset
      // The gun container is already positioned, we just adjust sprites within it
      const gunWidth = tank.gun.gun.width;
      const initialXOffset = -gunWidth * 0.5; // Move gun left so pivot is at center
      const initialYOffset = 0; // No vertical offset initially

      // Set gun sprite positions (negative offsets to align pivot)
      tank.gun.gun.x = initialXOffset;
      tank.gun.gun.y = initialYOffset;
      if (tank.gun.gunBase) {
        tank.gun.gunBase.x = initialXOffset;
        tank.gun.gunBase.y = initialYOffset;
      }
      if (tank.gun.fireAnimation) {
        tank.gun.fireAnimation.x = initialXOffset;
        tank.gun.fireAnimation.y = initialYOffset;
      }

      // Add tank to scroll container
      this.scrollContainer.addChild(tank.container);
      this.tankContainers.push(tank.container);

      // Create red dot at gun pivot point (pivot container origin)
      const gunAnchorDot = new Graphics();
      gunAnchorDot.circle(0, 0, 8);
      gunAnchorDot.fill(0xff0000); // Red dot
      gunAnchorDot.stroke({ width: 2, color: 0xffffff });

      // Calculate pivot position relative to scroll container
      const tankContainerX = x;
      const tankContainerY = y;
      const pivotX = tankContainerX + gunPivot.x;
      const pivotY = tankContainerY + gunPivot.y;

      gunAnchorDot.x = pivotX;
      gunAnchorDot.y = pivotY;
      gunAnchorDot.zIndex = 1000; // Always on top
      gunAnchorDot.eventMode = "static";
      gunAnchorDot.cursor = "pointer";

      // Add to scroll container at the same level as tank container
      this.scrollContainer.addChild(gunAnchorDot);

      // Store preview data
      const previewData: TankPreviewData = {
        tank: tank,
        anchorDot: gunAnchorDot,
        gunPivot: gunPivot,
        baseId: baseId,
        gunId: gunId,
        baseName: baseName,
        gunName: gunName,
        initialY: 0,
        currentYOffset: totalOffset,
        xOffset: initialXOffset,
        yOffset: initialYOffset,
        tankContainerX: tankContainerX,
        tankContainerY: tankContainerY,
      };
      this.tankPreviews.push(previewData);

      // Make anchor draggable
      gunAnchorDot.on("pointerdown", (e) => {
        this.selectPreview(previewData);
        // Get screen Y coordinate from the native event
        const nativeEvent = e.data.originalEvent;
        let screenY: number;
        if (nativeEvent && "clientY" in nativeEvent) {
          screenY = (nativeEvent as unknown as { clientY: number }).clientY;
        } else {
          screenY = e.global.y;
        }
        this.startDrag(screenY, previewData);
        e.stopPropagation();
      });

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
        text: `Base: ${baseOffset} | Gun: ${gunOffset} | Total: ${totalOffset} | X: ${initialXOffset.toFixed(1)} | Y: ${initialYOffset.toFixed(1)}`,
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
    };
    app.canvas.addEventListener("wheel", this.wheelHandler);
  }

  private selectPreview(preview: TankPreviewData): void {
    // Deselect previous preview
    if (this.selectedPreview) {
      this.selectedPreview.anchorDot.clear();
      this.selectedPreview.anchorDot.circle(0, 0, 8);
      this.selectedPreview.anchorDot.fill(0xff0000);
      this.selectedPreview.anchorDot.stroke({ width: 2, color: 0xffffff });
    }

    // Select new preview
    this.selectedPreview = preview;
    preview.anchorDot.clear();
    preview.anchorDot.circle(0, 0, 10);
    preview.anchorDot.fill(0x00ff00); // Green when selected
    preview.anchorDot.stroke({ width: 3, color: 0xffffff });
  }

  private startDrag(globalY: number, preview: TankPreviewData): void {
    this.isDragging = true;
    this.dragStartY = globalY;
    this.dragStartXOffset = preview.xOffset;
    this.dragStartYOffset = preview.yOffset;
  }

  private setupDragHandlers(): void {
    const app = window.app;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging || !this.selectedPreview) return;

      // Get mouse position in screen coordinates
      const mouseY = e.clientY;
      const deltaY = mouseY - this.dragStartY;

      // Update gun sprite position within pivot container
      // deltaY directly affects the Y offset (negative = up, positive = down)
      const newYOffset = this.dragStartYOffset + deltaY;
      const newXOffset = this.dragStartXOffset; // X offset can be adjusted if needed

      const tank = this.selectedPreview.tank;

      // Update gun sprite positions within gun container
      // Negative offsets move the gun so the pivot point aligns with desired location
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

      // Update anchor dot position to follow the pivot point (pivot container origin)
      const tankContainerX = this.selectedPreview.tankContainerX;
      const tankContainerY = this.selectedPreview.tankContainerY;
      const pivotX = tankContainerX + this.selectedPreview.gunPivot.x;
      const pivotY = tankContainerY + this.selectedPreview.gunPivot.y;

      this.selectedPreview.anchorDot.x = pivotX;
      this.selectedPreview.anchorDot.y = pivotY;

      // Update info text
      const infoText = (this.selectedPreview as any).infoText as Text;
      if (infoText) {
        const baseOffset = TankConfigRegistry.getGunYOffsetForBase(
          this.selectedPreview.baseId,
          this.selectedPreview.gunId
        );
        const gunOffset = this.selectedPreview.currentYOffset - baseOffset;
        infoText.text = `Base: ${baseOffset} | Gun: ${gunOffset.toFixed(1)} | X: ${newXOffset.toFixed(1)} | Y: ${newYOffset.toFixed(1)}`;
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
    if (!this.selectedPreview) {
      alert(
        "Please select a tank preview by clicking on its gun anchor (red/green dot)"
      );
      return;
    }

    const preview = this.selectedPreview;
    const baseConfig = TankConfigRegistry.getTankBase(preview.baseId);
    const gunConfig = TankConfigRegistry.getTankGun(preview.gunId);

    // Get sprite name from texture URL
    const spriteName =
      baseConfig?.baseTextureUrl.split("/").pop()?.replace(".png", "") ??
      "unknown";
    const gunName = preview.gunName;
    const yOffset = preview.currentYOffset;
    const xOffset = preview.xOffset;
    const yPivotOffset = preview.yOffset;

    // Get all tank information
    const baseOffset = TankConfigRegistry.getGunYOffsetForBase(
      preview.baseId,
      preview.gunId
    );
    const gunOffset = gunConfig?.gunYOffset ?? 0;
    const baseSpeed = baseConfig?.speed ?? 1.0;
    const gunRange = gunConfig?.range ?? 1000;
    const gunFireRate = gunConfig?.fireRate ?? 2;
    const gunDamage = gunConfig?.damage ?? 10;
    const gunBulletSpeed = gunConfig?.bulletSpeed ?? 1.0;

    // Create comprehensive export data
    const exportData = {
      spriteName: spriteName,
      gunName: gunName,
      baseId: preview.baseId,
      gunId: preview.gunId,
      baseName: preview.baseName,
      yOffset: yOffset.toFixed(2),
      baseConfig: {
        gunYOffset: baseOffset, // Current offset for this gun
        gunYOffsets: baseConfig?.gunYOffsets, // All per-gun offsets (if exists)
        speed: baseSpeed,
      },
      gunConfig: {
        gunYOffset: gunOffset,
        range: gunRange,
        fireRate: gunFireRate,
        damage: gunDamage,
        bulletSpeed: gunBulletSpeed,
        pivotOffset: {
          x: xOffset.toFixed(1),
          y: yPivotOffset.toFixed(1),
        },
      },
    };

    // Display in console
    console.log("=== EXPORT DATA ===");
    console.log(JSON.stringify(exportData, null, 2));
    console.log("===================");

    // Copy to clipboard
    const exportString = JSON.stringify(exportData, null, 2);
    navigator.clipboard
      .writeText(exportString)
      .then(() => {
        alert(
          `Export Data Copied to Clipboard!\n\nSprite: ${spriteName}\nGun: ${gunName}\nY Offset: ${yOffset.toFixed(2)}\nPivot X: ${xOffset.toFixed(1)}\nPivot Y: ${yPivotOffset.toFixed(1)}\n\n(Full data also logged to console)`
        );
      })
      .catch(() => {
        // Fallback if clipboard API fails
        alert(`Export Data:\n\n${exportString}\n\n(Also logged to console)`);
      });
  }

  update(_deltaTime: number): void {
    // Preview scene doesn't need updates
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
