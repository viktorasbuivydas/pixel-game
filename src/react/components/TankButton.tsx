import React, { useState, useEffect } from "react";
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = () => {
      try {
        let config;
        if (type === "base") {
          const baseId = getTankBaseIdFromIndex(index, colorIndex);
          config = TankConfigRegistry.getTankBase(baseId);
          if (config) {
            setImageUrl(config.baseTextureUrl);
          }
        } else {
          const gunId = getGunIdFromIndex(index, colorIndex);
          config = TankConfigRegistry.getTankGun(gunId);
          if (config) {
            setImageUrl(config.gunTextureUrl);
          }
        }
      } catch (error) {
        console.error(`Failed to load ${type} config:`, error);
        setImageUrl(null);
      }
    };

    loadImage();
  }, [type, index, colorIndex]);

  const borderWidth = isSelected ? 4 : 2;
  const borderColor = isSelected ? "#ffff00" : "#ffffff";
  const scale = type === "base" ? 0.8 : 0.8;

  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        width: `${size}px`,
        height: `${size + 28}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "8px",
          backgroundColor: "#333333",
          border: `${borderWidth}px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={label}
            style={{
              width: `${size * scale}px`,
              height: `${size * scale}px`,
              objectFit: "contain",
              imageRendering: "pixelated",
            }}
          />
        )}
      </div>
      <div
        style={{
          fontSize: "14px",
          color: "#ffffff",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  );
};
