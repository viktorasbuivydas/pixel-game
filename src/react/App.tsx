import React from "react";
import { SignInScene } from "./scenes/SignInScene";
import { TankSelectionScene } from "./scenes/TankSelectionScene";
import { MenuScene } from "./scenes/MenuScene";

export type SceneType = "signin" | "tank-selection" | "menu" | "game";

interface AppProps {
  currentScene: SceneType;
  onSceneChange: (scene: SceneType) => void;
}

export const App: React.FC<AppProps> = ({ currentScene, onSceneChange }) => {
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {currentScene === "signin" && (
        <SignInScene onSceneChange={onSceneChange} />
      )}
      {currentScene === "tank-selection" && (
        <TankSelectionScene onSceneChange={onSceneChange} />
      )}
      {currentScene === "menu" && <MenuScene onSceneChange={onSceneChange} />}
      {currentScene === "game" && (
        <div
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Game UI will be rendered here */}
        </div>
      )}
    </div>
  );
};
