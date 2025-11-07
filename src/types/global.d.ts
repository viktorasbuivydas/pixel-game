import { Application } from "pixi.js";

declare global {
  interface Window {
    app: Application;
  }
}

export {};
