import { Graphics, Container } from "pixi.js";
import { Bullet } from "../GunManager";

/**
 * UI Manager for GunManager
 * Handles bullet sprite generation and visual updates
 */
export class GunManagerUI {
  private container: Container;
  private bulletSize: number;

  constructor(container: Container, bulletSize: number) {
    this.container = container;
    this.bulletSize = bulletSize;
  }

  /**
   * Create a bullet sprite
   */
  public createBulletSprite(x: number, y: number, rotation: number): Graphics {
    const bulletSprite = new Graphics();
    bulletSprite.circle(0, 0, this.bulletSize);
    bulletSprite.fill(0xffff00); // Yellow bullet
    bulletSprite.stroke({ width: 1, color: 0xffaa00 });
    bulletSprite.x = x;
    bulletSprite.y = y;
    bulletSprite.rotation = rotation;
    bulletSprite.zIndex = 150; // Above fog and tanks

    this.container.addChild(bulletSprite);
    return bulletSprite;
  }

  /**
   * Update bullet sprite position
   */
  public updateBulletSprite(bullet: Bullet): void {
    bullet.sprite.x = bullet.x;
    bullet.sprite.y = bullet.y;
  }

  /**
   * Remove bullet sprite from container
   */
  public removeBulletSprite(bullet: Bullet): void {
    if (bullet.sprite.parent) {
      bullet.sprite.parent.removeChild(bullet.sprite);
    }
    bullet.sprite.destroy();
  }
}
