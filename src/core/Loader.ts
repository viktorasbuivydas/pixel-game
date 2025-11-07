import { Assets } from "pixi.js";

export async function loadAssets() {
  await Assets.loadBundle("main", [
    { alias: "player", src: "assets/player.png" },
    { alias: "enemy", src: "assets/enemy.png" },
  ]);
}

export function getTexture(alias: string) {
  return Assets.get(alias);
}
