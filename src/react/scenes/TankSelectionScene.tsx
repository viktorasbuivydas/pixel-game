import React, { useState, useEffect } from "react";
import { SceneType } from "../App";
import { TankButton } from "../components/TankButton";
import { TankPreview } from "../components/TankPreview";
import { TankConfigRegistry } from "../../core/tanks/TankConfig";
import {
  getTankBaseIdFromIndex,
  getGunIdFromIndex,
} from "../../core/tanks/TankUniqueIds";

interface TankSelectionSceneProps {
  onSceneChange: (scene: SceneType) => void;
}

interface TankSelection {
  colorIndex: number;
  baseIndex: number;
  gunIndex: number;
}

export const TankSelectionScene: React.FC<TankSelectionSceneProps> = ({
  onSceneChange,
}) => {
  const [selectedColor, setSelectedColor] = useState(1);
  const [selectedBase, setSelectedBase] = useState(1);
  const [selectedGun, setSelectedGun] = useState(1);
  const [stats, setStats] = useState<{
    baseName: string;
    baseSpeed: number;
    gunName: string;
    gunRange: number;
    gunFireRate: number;
    gunDamage: number;
    gunBulletSpeed: number;
  } | null>(null);

  const colors = [
    { index: 1, color: "#ff0000", name: "Red" },
    { index: 2, color: "#00ff00", name: "Green" },
    { index: 3, color: "#0000ff", name: "Blue" },
    { index: 4, color: "#ffff00", name: "Yellow" },
  ];

  const baseNames = ["Scout", "Light", "Heavy", "Medium"];
  const gunNames = ["Rapid", "Balanced", "Sniper", "Heavy"];

  // Update stats when selection changes
  useEffect(() => {
    const baseId = getTankBaseIdFromIndex(selectedBase, selectedColor);
    const gunId = getGunIdFromIndex(selectedGun, selectedColor);

    const baseConfig = TankConfigRegistry.getTankBase(baseId);
    const gunConfig = TankConfigRegistry.getTankGun(gunId);

    if (baseConfig && gunConfig) {
      setStats({
        baseName: baseConfig.name,
        baseSpeed: baseConfig.speed,
        gunName: gunConfig.name,
        gunRange: gunConfig.range,
        gunFireRate: gunConfig.fireRate,
        gunDamage: gunConfig.damage,
        gunBulletSpeed: gunConfig.bulletSpeed,
      });
    }
  }, [selectedBase, selectedGun, selectedColor]);

  const handleStartGame = () => {
    const selection: TankSelection = {
      colorIndex: selectedColor,
      baseIndex: selectedBase,
      gunIndex: selectedGun,
    };
    localStorage.setItem("tankSelection", JSON.stringify(selection));
    onSceneChange("game");
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
      }}
    >
      {/* Left Column */}
      <div
        style={{
          flex: "1",
          display: "flex",
          flexDirection: "column",
          padding: "40px",
          gap: "30px",
        }}
      >
        <h1 style={{ fontSize: "48px", fontWeight: "bold", margin: 0 }}>
          SELECT YOUR TANK
        </h1>

        {/* Color Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "24px", margin: 0 }}>COLOR</h2>
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "flex-start",
            }}
          >
            {colors.map((color) => (
              <button
                key={color.index}
                onClick={() => setSelectedColor(color.index)}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "8px",
                  border:
                    selectedColor === color.index
                      ? "4px solid #ffff00"
                      : "2px solid #ffffff",
                  backgroundColor: color.color,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        {/* Base Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "24px", margin: 0 }}>TANK BASE</h2>
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "flex-start",
            }}
          >
            {baseNames.map((name, index) => (
              <TankButton
                key={index + 1}
                type="base"
                index={index + 1}
                colorIndex={selectedColor}
                isSelected={selectedBase === index + 1}
                size={80}
                label={name}
                onClick={() => setSelectedBase(index + 1)}
              />
            ))}
          </div>
        </div>

        {/* Gun Selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "24px", margin: 0 }}>GUN</h2>
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "flex-start",
            }}
          >
            {gunNames.map((name, index) => (
              <TankButton
                key={index + 1}
                type="gun"
                index={index + 1}
                colorIndex={selectedColor}
                isSelected={selectedGun === index + 1}
                size={80}
                label={name}
                onClick={() => setSelectedGun(index + 1)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div
        style={{
          flex: "1",
          display: "flex",
          flexDirection: "column",
          padding: "40px",
          alignItems: "flex-end",
          gap: "20px",
        }}
      >
        <button
          onClick={handleStartGame}
          style={{
            padding: "16px 40px",
            fontSize: "32px",
            fontWeight: "bold",
            borderRadius: "12px",
            border: "3px solid #ffffff",
            backgroundColor: "#4a90e2",
            color: "#ffffff",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#5aa0f2")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#4a90e2")
          }
        >
          START GAME
        </button>

        {/* Tank Preview Area - Centered */}
        <div
          style={{
            flex: "1",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            marginTop: "20px",
            overflow: "hidden",
          }}
        >
          <TankPreview
            baseIndex={selectedBase}
            gunIndex={selectedGun}
            colorIndex={selectedColor}
          />
        </div>

        {/* Stats Section - Below Preview */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "bold" }}>
            STATS
          </h2>
          {stats ? (
            <div style={{ fontSize: "18px", lineHeight: "1.6" }}>
              <div>TANK: {stats.baseName}</div>
              <div>Speed: {(stats.baseSpeed * 100).toFixed(0)}%</div>
              <div style={{ marginTop: "10px" }}>GUN: {stats.gunName}</div>
              <div>Range: {stats.gunRange}m</div>
              <div>Fire Rate: {stats.gunFireRate}/s</div>
              <div>Damage: {stats.gunDamage}</div>
              <div>
                Bullet Speed: {(stats.gunBulletSpeed * 100).toFixed(0)}%
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "18px" }}>Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
};
