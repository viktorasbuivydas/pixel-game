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
  const isInitializedRef = useRef(false);

  // Initialize PixiJS app only once
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    let mounted = true;

    const initApp = async () => {
      if (!containerRef.current || !mounted) return;

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
        try {
          app.destroy(true, {
            children: true,
            texture: false,
          });
        } catch (error) {
          console.warn("Error destroying app in mounted check:", error);
        }
        return;
      }

      appRef.current = app;
      containerRef.current.appendChild(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      isInitializedRef.current = true;

      // Create initial tank
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

        if (!mounted || !appRef.current) {
          tank.container.destroy({ children: true });
          return;
        }

        tankRef.current = tank;
        appRef.current.stage.addChild(tank.container);
      } catch (error) {
        console.error("Failed to create preview tank:", error);
      }
    };

    // Handle resize
    const handleResize = () => {
      if (appRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(rect.width || 400, 400);
        const height = Math.max(rect.height || 400, 400);
        appRef.current.renderer.resize(width, height);
        if (tankRef.current?.container) {
          tankRef.current.container.x = width / 2;
          tankRef.current.container.y = height / 2;
        }
      }
    };

    // Use requestAnimationFrame to ensure container is rendered
    const rafId = requestAnimationFrame(() => {
      initApp();
    });

    window.addEventListener("resize", handleResize);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      if (tankRef.current?.container) {
        try {
          if (appRef.current) {
            appRef.current.stage.removeChild(tankRef.current.container);
          }
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
          });
        } catch (error) {
          console.warn("Error destroying PixiJS app:", error);
        }
        appRef.current = null;
        isInitializedRef.current = false;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []); // Only run once on mount

  // Update tank when selection changes (but keep app alive)
  useEffect(() => {
    if (!isInitializedRef.current || !appRef.current) return;

    let mounted = true;

    const updateTank = async () => {
      if (!appRef.current || !mounted) return;

      // Remove old tank
      if (tankRef.current?.container) {
        try {
          appRef.current.stage.removeChild(tankRef.current.container);
          tankRef.current.container.destroy({ children: true });
        } catch (error) {
          console.warn("Error removing old tank:", error);
        }
        tankRef.current = null;
      }

      // Get container dimensions
      const rect = containerRef.current?.getBoundingClientRect();
      const width = Math.max(rect?.width || 400, 400);
      const height = Math.max(rect?.height || 400, 400);

      // Create new tank
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

        if (!mounted || !appRef.current) {
          tank.container.destroy({ children: true });
          return;
        }

        tankRef.current = tank;
        appRef.current.stage.addChild(tank.container);
      } catch (error) {
        console.error("Failed to create preview tank:", error);
      }
    };

    updateTank();

    return () => {
      mounted = false;
    };
  }, [baseIndex, gunIndex, colorIndex]); // Only update tank when selection changes

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
