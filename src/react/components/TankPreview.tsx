import React, { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import { Tank1 } from "../../core/tanks/Tank1";
import {
  getTankBaseIdFromIndex,
  getGunIdFromIndex,
} from "../../core/tanks/TankUniqueIds";

interface TankPreviewProps {
  baseIndex: number;
  gunIndex: number;
  colorIndex: number;
}

export const TankPreview: React.FC<TankPreviewProps> = ({
  baseIndex,
  gunIndex,
  colorIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const tankRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const initPreview = async () => {
      // Clean up previous preview
      if (tankRef.current?.container) {
        tankRef.current.container.destroy({ children: true });
        tankRef.current = null;
      }

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

      if (!mounted || !containerRef.current) return;

      // Get container dimensions
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width || 400, 400);
      const height = Math.max(rect.height || 400, 400);

      // Create PixiJS application
      const app = new Application();
      await app.init({
        width,
        height,
        backgroundColor: 0x1a1a1a,
        antialias: true,
      });

      if (!mounted || !containerRef.current) {
        app.destroy(true, { children: true, texture: false });
        return;
      }

      appRef.current = app;
      containerRef.current.appendChild(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";

      // Create tank
      const baseId = getTankBaseIdFromIndex(baseIndex, colorIndex);
      const gunId = getGunIdFromIndex(gunIndex, colorIndex);

      try {
        const tank = await Tank1.create({
          baseId,
          gunId,
          initialX: width / 2,
          initialY: height / 2,
          scale: 1,
        });

        if (!mounted) {
          tank.container.destroy({ children: true });
          return;
        }

        tankRef.current = tank;
        app.stage.addChild(tank.container);
      } catch (error) {
        console.error("Failed to create preview tank:", error);
      }
    };

    // Use requestAnimationFrame to ensure container is rendered
    const rafId = requestAnimationFrame(() => {
      initPreview();
    });

    // Handle resize
    const handleResize = () => {
      if (appRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(rect.width || 400, 400);
        const height = Math.max(rect.height || 300, 300);
        appRef.current.renderer.resize(width, height);
        if (tankRef.current?.container) {
          tankRef.current.container.x = width / 2;
          tankRef.current.container.y = height / 2;
        }
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      if (tankRef.current?.container) {
        try {
          tankRef.current.container.destroy({ children: true });
        } catch (error) {
          console.warn("Error destroying tank container:", error);
        }
        tankRef.current = null;
      }
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
  }, [baseIndex, gunIndex, colorIndex]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "300px",
      }}
    />
  );
};
