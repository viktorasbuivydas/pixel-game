import { Application } from "pixi.js";
import { initDevtools } from "@pixi/devtools";
import { SceneManager } from "./src/core/SceneManager";
import { MenuScene } from "./src/scenes/MenuScene";

(async (): Promise<void> => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: "#111111", resizeTo: window });
  initDevtools({ app });

  // Store app globally for SceneManager access
  window.app = app;

  // Append the application canvas to the document body
  document.body.appendChild(app.canvas);

  // Initialize and show menu scene
  const menuScene = new MenuScene();
  menuScene.initialize();
  SceneManager.changeScene(menuScene);

  // Game loop - update current scene
  app.ticker.add((time) => {
    const currentScene = SceneManager.scene;
    if (currentScene && "update" in currentScene) {
      (currentScene as any).update(time.deltaTime);
    }
  });
})();
