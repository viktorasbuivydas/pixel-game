/**
 * Tank base configuration
 */
export interface TankBaseConfig {
  id: string; // Full ID including color variant (e.g., "scout_tank_color1")
  baseId: string; // Unique base ID without color (e.g., "scout_tank") - REQUIRED
  name: string;
  baseTextureUrl: string; // Main tank base sprite
  deadTextureUrl: string; // Dead/destroyed tank base sprite
  animationTextures?: string[]; // Animation frames for tank base (optional)
  scale?: number;
  speed: number; // Tank movement speed multiplier
}

/**
 * Tank gun configuration
 */
export interface TankGunConfig {
  id: string; // Full ID including color variant (e.g., "rapid_fire_color1")
  gunId: string; // Unique gun ID without color (e.g., "rapid_fire") - REQUIRED
  name: string;
  gunTextureUrl: string; // Main gun sprite
  gunBaseTextureUrl?: string; // Gun base/platform sprite (optional)
  animationTextures?: string[]; // Animation frames for gun (optional)
  fireAnimationTextures?: string[]; // Fire/muzzle flash animation (optional)
  scale?: number;
  range: number; // Gun range (affects bullet lifetime)
  fireRate: number; // Shots per second
  damage: number; // Damage per shot
  bulletSpeed: number; // Bullet speed multiplier
  gunYOffset?: number; // Y offset for gun position relative to tank base center (optional, defaults to 0) - used to align gun with tank center hole
  anchor?: { x: number; y: number }; // Anchor point for gun sprite (x: horizontal anchor 0-1, y: vertical anchor 0-1) (optional, defaults to { x: 0.5, y: 0.15 })
  pivotYOffset?: number; // Y offset for gun rotation pivot point (vertical offset from top of gun sprite) (optional, defaults to 10)
  anchorPixelOffsetFromBottom?: number; // Pixel offset from bottom of sprite for rotation point - if set, overrides anchor.y (optional, for pixel-precise positioning regardless of sprite size)
  fireAnimationAnchor?: { x: number; y: number }; // Anchor point for fire animation sprite (optional, defaults to { x: 0.5, y: 0.5 })
}

/**
 * Registry for all available tank bases and guns
 */
export class TankConfigRegistry {
  private static tankBases: Map<string, TankBaseConfig> = new Map();
  private static tankGuns: Map<string, TankGunConfig> = new Map();

  /**
   * Register a tank base configuration
   */
  static registerTankBase(config: TankBaseConfig): void {
    this.tankBases.set(config.id, config);
  }

  /**
   * Register a tank gun configuration
   */
  static registerTankGun(config: TankGunConfig): void {
    this.tankGuns.set(config.id, config);
  }

  /**
   * Get tank base configuration by ID
   */
  static getTankBase(id: string): TankBaseConfig | undefined {
    return this.tankBases.get(id);
  }

  /**
   * Get tank gun configuration by ID
   */
  static getTankGun(id: string): TankGunConfig | undefined {
    return this.tankGuns.get(id);
  }

  /**
   * Get all registered tank bases
   */
  static getAllTankBases(): TankBaseConfig[] {
    return Array.from(this.tankBases.values());
  }

  /**
   * Get all registered tank guns
   */
  static getAllTankGuns(): TankGunConfig[] {
    return Array.from(this.tankGuns.values());
  }

  /**
   * Check if tank base exists
   */
  static hasTankBase(id: string): boolean {
    return this.tankBases.has(id);
  }

  /**
   * Check if tank gun exists
   */
  static hasTankGun(id: string): boolean {
    return this.tankGuns.has(id);
  }
}
