/// <reference types="vite/client" />

import { Application } from "pixi.js";

declare global {
  interface Window {
    app: Application;
  }
}

// Declare module for image imports
declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.gif" {
  const value: string;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}

declare module "*.mp3" {
  const value: string;
  export default value;
}

// Vite environment variables - augmenting Vite's ImportMetaEnv
declare module "vite/client" {
  interface ImportMetaEnv {
    readonly VITE_COLYSEUS_HOST?: string;
  }
}

// Ensure ImportMeta is available
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
