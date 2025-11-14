import { Application } from "pixi.js";
import { initDevtools } from "@pixi/devtools";
import { SceneManager } from "./src/core/SceneManager";
import { SignInScene } from "./src/scenes/SignInScene";
import { initializeTankRegistry } from "./src/core/tanks/TankRegistry";
import { TankPreviewScene } from "@/scenes/TankPreviewScene";

// Initialize tank registry at startup
initializeTankRegistry();

(async (): Promise<void> => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({
    width: 1280,
    height: 720,
    resolution: window.devicePixelRatio,
    autoDensity: true,
    antialias: true,
    backgroundColor: 0xffffff,
  });
  initDevtools({ app });

  // Store app globally for SceneManager access
  window.app = app;

  // Append the application canvas to the document body
  document.body.appendChild(app.canvas);

  // Initialize and show sign-in scene
  // const signInScene = new SignInScene();
  // signInScene.initialize();
  // SceneManager.changeScene(signInScene);
  const tankPreviewScene = new TankPreviewScene();
  tankPreviewScene.initialize();
  SceneManager.changeScene(tankPreviewScene);

  // Game loop - update current scene
  app.ticker.add((time) => {
    const currentScene = SceneManager.scene;
    if (currentScene && "update" in currentScene) {
      (currentScene as any).update(time.deltaTime);
    }
  });
})();
