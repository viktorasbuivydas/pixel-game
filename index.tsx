import { Application } from "pixi.js";
import { initDevtools } from "@pixi/devtools";
import { SceneManager } from "./src/core/SceneManager";
import { initializeTankRegistry } from "./src/core/tanks/TankRegistry";
import { createRoot } from "react-dom/client";
import { App, SceneType } from "./src/react/App";
import { MainScene } from "./src/scenes/MainScene";

// Initialize tank registry at startup
initializeTankRegistry();

(async (): Promise<void> => {
  // Initialize React
  const reactRoot = document.getElementById("react-root");
  if (!reactRoot) {
    throw new Error("React root element not found");
  }

  const root = createRoot(reactRoot);
  let currentScene: SceneType = "signin";

  const handleSceneChange = (scene: SceneType) => {
    currentScene = scene;
    root.render(<App currentScene={scene} onSceneChange={handleSceneChange} />);

    // If switching to game, initialize PixiJS
    if (scene === "game") {
      initializePixiJS();
    } else {
      // Hide PixiJS canvas when not in game
      const pixiContainer = document.getElementById("pixi-container");
      if (pixiContainer) {
        pixiContainer.style.display = "none";
      }
    }
  };

  // Initial render
  root.render(
    <App currentScene={currentScene} onSceneChange={handleSceneChange} />
  );

  // Initialize PixiJS (will be shown when game starts)
  async function initializePixiJS() {
    const pixiContainer = document.getElementById("pixi-container");
    if (!pixiContainer) {
      throw new Error("PixiJS container element not found");
    }

    // Clear container if already initialized
    pixiContainer.innerHTML = "";
    pixiContainer.style.display = "block";
    pixiContainer.style.position = "absolute";
    pixiContainer.style.top = "0";
    pixiContainer.style.left = "0";
    pixiContainer.style.width = "100%";
    pixiContainer.style.height = "100%";
    pixiContainer.style.zIndex = "0";

    // Create a new application
    const app = new Application();

    // Initialize the application
    await app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: window.devicePixelRatio,
      autoDensity: true,
      antialias: true,
      backgroundColor: 0x1a1a1a,
    });
    initDevtools({ app });

    // Store app globally for SceneManager access
    window.app = app;

    // Append the application canvas to the pixi container
    pixiContainer.appendChild(app.canvas);

    // Handle window resize
    window.addEventListener("resize", () => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
    });

    // Initialize and show main game scene
    const mainScene = new MainScene();
    await mainScene.initialize();
    SceneManager.changeScene(mainScene);

    // Game loop - update current scene
    app.ticker.add((time) => {
      const currentScene = SceneManager.scene;
      if (currentScene && "update" in currentScene) {
        (currentScene as any).update(time.deltaTime);
      }
    });
  }
})();
