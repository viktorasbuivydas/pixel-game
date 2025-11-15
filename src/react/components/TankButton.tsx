import React, { useEffect, useRef } from "react";
import { Container, Sprite, Graphics, Assets, Text, TextStyle } from "pixi.js";
import { TankConfigRegistry } from "../../core/tanks/TankConfig";
import {
  getTankBaseIdFromIndex,
  getGunIdFromIndex,
} from "../../core/tanks/TankUniqueIds";

interface TankButtonProps {
  type: "base" | "gun";
  index: number;
  colorIndex: number;
  isSelected: boolean;
  size: number;
  label: string;
  onClick: () => void;
}

export const TankButton: React.FC<TankButtonProps> = ({
  type,
  index,
  colorIndex,
  isSelected,
  size,
  label,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiContainerRef = useRef<Container | null>(null);
  const appRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    // Create a small PixiJS application for this button
    const initPixi = async () => {
      const { Application } = await import("pixi.js");

      // Clean up previous app if exists
      if (appRef.current) {
        try {
          if (containerRef.current && appRef.current.canvas) {
            containerRef.current.removeChild(appRef.current.canvas);
          }
          appRef.current.destroy(true, {
            children: true,
            texture: false,
            baseTexture: false,
          });
        } catch (error) {
          console.warn("Error cleaning up previous PixiJS app:", error);
        }
        appRef.current = null;
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      }

      if (!mounted) return;

      const app = new Application();
      await app.init({
        width: size,
        height: size + 28,
        backgroundColor: 0x333333,
        antialias: true,
      });

      if (!mounted) {
        try {
          app.destroy(true, {
            children: true,
            texture: false,
            baseTexture: false,
          });
        } catch (error) {
          console.warn("Error destroying app in mounted check:", error);
        }
        return;
      }

      appRef.current = app;
      containerRef.current!.appendChild(app.canvas);
      app.canvas.style.width = `${size}px`;
      app.canvas.style.height = `${size + 28}px`;

      const container = new Container();
      pixiContainerRef.current = container;
      app.stage.addChild(container);

      // Draw border
      const graphics = new Graphics();
      const borderWidth = isSelected ? 4 : 2;
      const borderColor = isSelected ? 0xffff00 : 0xffffff;
      graphics.roundRect(0, 0, size, size, 8);
      graphics.fill(0x333333);
      graphics.stroke({ width: borderWidth, color: borderColor });
      container.addChild(graphics);

      // Load and display sprite
      try {
        let config;
        let sprite: Sprite | null = null;
        if (type === "base") {
          const baseId = getTankBaseIdFromIndex(index, colorIndex);
          config = TankConfigRegistry.getTankBase(baseId);
          if (config) {
            const texture = await Assets.load(config.baseTextureUrl);
            sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.scale.set(0.3);
            sprite.x = size / 2;
            sprite.y = size / 2;
            container.addChild(sprite);
          }
        } else {
          const gunId = getGunIdFromIndex(index, colorIndex);
          config = TankConfigRegistry.getTankGun(gunId);
          if (config) {
            const texture = await Assets.load(config.gunTextureUrl);
            sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.scale.set(0.4);
            sprite.x = size / 2;
            sprite.y = size / 2;
            container.addChild(sprite);
          }
        }
      } catch (error) {
        console.error(`Failed to load ${type} sprite:`, error);
      }

      // Add label text
      const textStyle = new TextStyle({
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "center",
      });
      const text = new Text({ text: label, style: textStyle });
      text.anchor.set(0.5);
      text.x = size / 2;
      text.y = size + 14;
      container.addChild(text);
    };

    initPixi();

    return () => {
      mounted = false;
      if (appRef.current) {
        try {
          // Stop ticker if it exists
          if (appRef.current.ticker) {
            appRef.current.ticker.stop();
          }
          // Remove canvas from DOM first
          if (containerRef.current && appRef.current.canvas) {
            try {
              containerRef.current.removeChild(appRef.current.canvas);
            } catch (e) {
              // Canvas might already be removed
            }
          }
          // Then destroy the app
          appRef.current.destroy(true, {
            children: true,
            texture: false,
            baseTexture: false,
          });
        } catch (error) {
          console.warn("Error destroying PixiJS app:", error);
        }
        appRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [type, index, colorIndex, isSelected, size, label]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        cursor: "pointer",
        width: `${size}px`,
        height: `${size + 28}px`,
      }}
    />
  );
};
