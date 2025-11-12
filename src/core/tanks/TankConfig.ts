/**
 * Tank base configuration
 */
export interface TankBaseConfig {
  id: string;
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
  id: string;
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
