/**
 * Tank Registry - Register all available tank bases and guns
 *
 * This file should be imported and initialized at application startup
 * to register all available tank configurations.
 */

import { TankConfigRegistry } from "./TankConfig";
import { TANK_BASE_IDS, GUN_IDS } from "./TankUniqueIds";

// Import tank base textures - Color 1
import tank1Color1 from "../../assets/tanks/PNG/Tanks_base/tank1_color1.png";
import tank1Color1Broken from "../../assets/tanks/PNG/Broken_assets/tank1_color1_broken.png";
import tank2Color1 from "../../assets/tanks/PNG/Tanks_base/tank2_color1.png";
import tank2Color1Broken from "../../assets/tanks/PNG/Broken_assets/tank2_color1_broken.png";
import tank3Color1 from "../../assets/tanks/PNG/Tanks_base/tank3_color1.png";
import tank3Color1Broken from "../../assets/tanks/PNG/Broken_assets/tank3_color1_broken.png";
import tank4Color1 from "../../assets/tanks/PNG/Tanks_base/tank4_color1.png";
import tank4Color1Broken from "../../assets/tanks/PNG/Broken_assets/tank4_color1_broken.png";

// Import tank base textures - Color 2
import tank1Color2 from "../../assets/tanks/PNG/Tanks_base/tank1_color2.png";
import tank1Color2Broken from "../../assets/tanks/PNG/Broken_assets/tank1_color1_broken.png"; // Reuse broken sprite
import tank2Color2 from "../../assets/tanks/PNG/Tanks_base/tank2_color2.png";
import tank2Color2Broken from "../../assets/tanks/PNG/Broken_assets/tank2_color1_broken.png";
import tank3Color2 from "../../assets/tanks/PNG/Tanks_base/tank3_color2.png";
import tank3Color2Broken from "../../assets/tanks/PNG/Broken_assets/tank3_color1_broken.png";
import tank4Color2 from "../../assets/tanks/PNG/Tanks_base/tank4_color2.png";
import tank4Color2Broken from "../../assets/tanks/PNG/Broken_assets/tank4_color1_broken.png";

// Import tank base textures - Color 3
import tank1Color3 from "../../assets/tanks/PNG/Tanks_base/tank1_color3.png";
import tank1Color3Broken from "../../assets/tanks/PNG/Broken_assets/tank1_color1_broken.png";
import tank2Color3 from "../../assets/tanks/PNG/Tanks_base/tank2_color3.png";
import tank2Color3Broken from "../../assets/tanks/PNG/Broken_assets/tank2_color1_broken.png";
import tank3Color3 from "../../assets/tanks/PNG/Tanks_base/tank3_color3.png";
import tank3Color3Broken from "../../assets/tanks/PNG/Broken_assets/tank3_color1_broken.png";
import tank4Color3 from "../../assets/tanks/PNG/Tanks_base/tank4_color3.png";
import tank4Color3Broken from "../../assets/tanks/PNG/Broken_assets/tank4_color1_broken.png";

// Import tank base textures - Color 4
import tank1Color4 from "../../assets/tanks/PNG/Tanks_base/tank1_color4.png";
import tank1Color4Broken from "../../assets/tanks/PNG/Broken_assets/tank1_color1_broken.png";
import tank2Color4 from "../../assets/tanks/PNG/Tanks_base/tank2_color4.png";
import tank2Color4Broken from "../../assets/tanks/PNG/Broken_assets/tank2_color1_broken.png";
import tank3Color4 from "../../assets/tanks/PNG/Tanks_base/tank3_color4.png";
import tank3Color4Broken from "../../assets/tanks/PNG/Broken_assets/tank3_color1_broken.png";
import tank4Color4 from "../../assets/tanks/PNG/Tanks_base/tank4_color4.png";
import tank4Color4Broken from "../../assets/tanks/PNG/Broken_assets/tank4_color1_broken.png";

// Import gun textures - Cannon 1 (Color 1)
import cannon1_1_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon1_1.png";
import cannon1_2_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon1_2.png";
import cannon1_3_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon1_3.png";
import cannon1_4_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon1_4.png";

// Import gun textures - Cannon 1 (Color 2)
import cannon1_1_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon1_1.png";
import cannon1_2_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon1_2.png";
import cannon1_3_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon1_3.png";
import cannon1_4_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon1_4.png";

// Import gun textures - Cannon 1 (Color 3)
import cannon1_1_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon1_1.png";
import cannon1_2_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon1_2.png";
import cannon1_3_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon1_3.png";
import cannon1_4_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon1_4.png";

// Import gun textures - Cannon 1 (Color 4)
import cannon1_1_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon1_1.png";
import cannon1_2_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon1_2.png";
import cannon1_3_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon1_3.png";
import cannon1_4_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon1_4.png";

// Import gun textures - Cannon 2 (Color 1)
import cannon2_1_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon2_1.png";
import cannon2_2_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon2_2.png";
import cannon2_3_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon2_3.png";
import cannon2_4_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon2_4.png";

// Import gun textures - Cannon 2 (Color 2)
import cannon2_1_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon2_1.png";
import cannon2_2_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon2_2.png";
import cannon2_3_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon2_3.png";
import cannon2_4_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon2_4.png";

// Import gun textures - Cannon 2 (Color 3)
import cannon2_1_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon2_1.png";
import cannon2_2_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon2_2.png";
import cannon2_3_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon2_3.png";
import cannon2_4_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon2_4.png";

// Import gun textures - Cannon 2 (Color 4)
import cannon2_1_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon2_1.png";
import cannon2_2_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon2_2.png";
import cannon2_3_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon2_3.png";
import cannon2_4_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon2_4.png";

// Import gun textures - Cannon 3 (Color 1)
import cannon3_1_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon3_1.png";
import cannon3_2_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon3_2.png";
import cannon3_3_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon3_3.png";
import cannon3_4_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon3_4.png";

// Import gun textures - Cannon 3 (Color 2)
import cannon3_1_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon3_1.png";
import cannon3_2_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon3_2.png";
import cannon3_3_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon3_3.png";
import cannon3_4_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon3_4.png";

// Import gun textures - Cannon 3 (Color 3)
import cannon3_1_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon3_1.png";
import cannon3_2_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon3_2.png";
import cannon3_3_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon3_3.png";
import cannon3_4_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon3_4.png";

// Import gun textures - Cannon 3 (Color 4)
import cannon3_1_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon3_1.png";
import cannon3_2_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon3_2.png";
import cannon3_3_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon3_3.png";
import cannon3_4_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon3_4.png";

// Import gun textures - Cannon 4 (Color 1)
import cannon4_1_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon4_1.png";
import cannon4_2_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon4_2.png";
import cannon4_3_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon4_3.png";
import cannon4_4_c1 from "../../assets/tanks/PNG/Cannons_color1/cannon4_4.png";

// Import gun textures - Cannon 4 (Color 2)
import cannon4_1_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon4_1.png";
import cannon4_2_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon4_2.png";
import cannon4_3_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon4_3.png";
import cannon4_4_c2 from "../../assets/tanks/PNG/Cannons_color2/cannon4_4.png";

// Import gun textures - Cannon 4 (Color 3)
import cannon4_1_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon4_1.png";
import cannon4_2_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon4_2.png";
import cannon4_3_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon4_3.png";
import cannon4_4_c3 from "../../assets/tanks/PNG/Cannons_color3/cannon4_4.png";

// Import gun textures - Cannon 4 (Color 4)
import cannon4_1_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon4_1.png";
import cannon4_2_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon4_2.png";
import cannon4_3_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon4_3.png";
import cannon4_4_c4 from "../../assets/tanks/PNG/Cannons_color4/cannon4_4.png";

// Import fire animation textures
import fire1_1 from "../../assets/tanks/PNG/Fire1/Fire1_1.png";
import fire1_2 from "../../assets/tanks/PNG/Fire1/Fire1_2.png";
import fire1_3 from "../../assets/tanks/PNG/Fire1/Fire1_3.png";

/**
 * Initialize and register all tank bases and guns
 * Call this function at application startup
 */
export function initializeTankRegistry(): void {
  // Register Tank Bases - 4 bases with 4 colors each
  // Base 1 - All colors (Scout Tank)
  // Example: Using gunYOffsets to set different offsets per unique gun ID
  const scoutTankGunYOffsets = {
    [GUN_IDS.RAPID_FIRE]: 20,
    [GUN_IDS.BALANCED]: 15,
    [GUN_IDS.HEAVY_CANNON]: 25,
    [GUN_IDS.SNIPER]: 30,
  };
  TankConfigRegistry.registerTankBase({
    id: "scout_tank_color1",
    baseId: TANK_BASE_IDS.SCOUT_TANK,
    name: "Scout Tank",
    baseTextureUrl: tank1Color1,
    deadTextureUrl: tank1Color1Broken,
    scale: 1,
    speed: 1.3, // Fast scout
    gunYOffset: 20, // Y offset for gun position (adjust as needed) - DEPRECATED: use gunYOffsets instead
    gunYOffsets: scoutTankGunYOffsets, // Per-gun offsets using unique gun IDs
  });
  TankConfigRegistry.registerTankBase({
    id: "scout_tank_color2",
    baseId: TANK_BASE_IDS.SCOUT_TANK,
    name: "Scout Tank",
    baseTextureUrl: tank1Color2,
    deadTextureUrl: tank1Color2Broken,
    scale: 1,
    speed: 1.3,
    gunYOffsets: scoutTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "scout_tank_color3",
    baseId: TANK_BASE_IDS.SCOUT_TANK,
    name: "Scout Tank",
    baseTextureUrl: tank1Color3,
    deadTextureUrl: tank1Color3Broken,
    scale: 1,
    speed: 1.3,
    gunYOffsets: scoutTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "scout_tank_color4",
    baseId: TANK_BASE_IDS.SCOUT_TANK,
    name: "Scout Tank",
    baseTextureUrl: tank1Color4,
    deadTextureUrl: tank1Color4Broken,
    scale: 1,
    speed: 1.3,
    gunYOffsets: scoutTankGunYOffsets,
  });

  // Base 2 - All colors (Light Tank)
  const lightTankGunYOffsets = {
    [GUN_IDS.RAPID_FIRE]: 18,
    [GUN_IDS.BALANCED]: 20,
    [GUN_IDS.HEAVY_CANNON]: 22,
    [GUN_IDS.SNIPER]: 25,
  };
  TankConfigRegistry.registerTankBase({
    id: "light_tank_color1",
    baseId: TANK_BASE_IDS.LIGHT_TANK,
    name: "Light Tank",
    baseTextureUrl: tank2Color1,
    deadTextureUrl: tank2Color1Broken,
    scale: 1,
    speed: 1.1, // Balanced
    gunYOffset: 20, // Y offset for gun position (adjust as needed) - DEPRECATED
    gunYOffsets: lightTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "light_tank_color2",
    baseId: TANK_BASE_IDS.LIGHT_TANK,
    name: "Light Tank",
    baseTextureUrl: tank2Color2,
    deadTextureUrl: tank2Color2Broken,
    scale: 1,
    speed: 1.1,
    gunYOffsets: lightTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "light_tank_color3",
    baseId: TANK_BASE_IDS.LIGHT_TANK,
    name: "Light Tank",
    baseTextureUrl: tank2Color3,
    deadTextureUrl: tank2Color3Broken,
    scale: 1,
    speed: 1.1,
    gunYOffsets: lightTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "light_tank_color4",
    baseId: TANK_BASE_IDS.LIGHT_TANK,
    name: "Light Tank",
    baseTextureUrl: tank2Color4,
    deadTextureUrl: tank2Color4Broken,
    scale: 1,
    speed: 1.1,
    gunYOffsets: lightTankGunYOffsets,
  });

  // Base 3 - All colors (Heavy Tank)
  const heavyTankGunYOffsets = {
    [GUN_IDS.RAPID_FIRE]: 22,
    [GUN_IDS.BALANCED]: 25,
    [GUN_IDS.HEAVY_CANNON]: 28,
    [GUN_IDS.SNIPER]: 30,
  };
  TankConfigRegistry.registerTankBase({
    id: "heavy_tank_color1",
    baseId: TANK_BASE_IDS.HEAVY_TANK,
    name: "Heavy Tank",
    baseTextureUrl: tank3Color1,
    deadTextureUrl: tank3Color1Broken,
    scale: 1,
    speed: 0.8, // Slow but armored
    gunYOffset: 20, // Y offset for gun position (adjust as needed) - DEPRECATED
    gunYOffsets: heavyTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "heavy_tank_color2",
    baseId: TANK_BASE_IDS.HEAVY_TANK,
    name: "Heavy Tank",
    baseTextureUrl: tank3Color2,
    deadTextureUrl: tank3Color2Broken,
    scale: 1,
    speed: 0.8,
    gunYOffsets: heavyTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "heavy_tank_color3",
    baseId: TANK_BASE_IDS.HEAVY_TANK,
    name: "Heavy Tank",
    baseTextureUrl: tank3Color3,
    deadTextureUrl: tank3Color3Broken,
    scale: 1,
    speed: 0.8,
    gunYOffsets: heavyTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "heavy_tank_color4",
    baseId: TANK_BASE_IDS.HEAVY_TANK,
    name: "Heavy Tank",
    baseTextureUrl: tank3Color4,
    deadTextureUrl: tank3Color4Broken,
    scale: 1,
    speed: 0.8,
    gunYOffsets: heavyTankGunYOffsets,
  });

  // Base 4 - All colors (Medium Tank)
  const mediumTankGunYOffsets = {
    [GUN_IDS.RAPID_FIRE]: 15,
    [GUN_IDS.BALANCED]: 18,
    [GUN_IDS.HEAVY_CANNON]: 20,
    [GUN_IDS.SNIPER]: 22,
  };
  TankConfigRegistry.registerTankBase({
    id: "medium_tank_color1",
    baseId: TANK_BASE_IDS.MEDIUM_TANK,
    name: "Medium Tank",
    baseTextureUrl: tank4Color1,
    deadTextureUrl: tank4Color1Broken,
    scale: 1,
    speed: 1.0, // Standard
    gunYOffset: 0, // Y offset for gun position (adjust as needed) - DEPRECATED
    gunYOffsets: mediumTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "medium_tank_color2",
    baseId: TANK_BASE_IDS.MEDIUM_TANK,
    name: "Medium Tank",
    baseTextureUrl: tank4Color2,
    deadTextureUrl: tank4Color2Broken,
    scale: 1,
    speed: 1.0,
    gunYOffsets: mediumTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "medium_tank_color3",
    baseId: TANK_BASE_IDS.MEDIUM_TANK,
    name: "Medium Tank",
    baseTextureUrl: tank4Color3,
    deadTextureUrl: tank4Color3Broken,
    scale: 1,
    speed: 1.0,
    gunYOffsets: mediumTankGunYOffsets,
  });
  TankConfigRegistry.registerTankBase({
    id: "medium_tank_color4",
    baseId: TANK_BASE_IDS.MEDIUM_TANK,
    name: "Medium Tank",
    baseTextureUrl: tank4Color4,
    deadTextureUrl: tank4Color4Broken,
    scale: 1,
    speed: 1.0,
    gunYOffsets: mediumTankGunYOffsets,
  });

  // Register Tank Guns - 4 different guns with 4 colors each
  // Cannon 1 - Rapid Fire (All colors)
  TankConfigRegistry.registerTankGun({
    id: "rapid_fire_color1",
    gunId: GUN_IDS.RAPID_FIRE,
    name: "Rapid Fire",
    gunTextureUrl: cannon1_1_c1,
    animationTextures: [cannon1_1_c1, cannon1_2_c1, cannon1_3_c1, cannon1_4_c1],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 800,
    fireRate: 3, // Fast fire rate
    damage: 8, // Lower damage
    bulletSpeed: 0.9,
    gunYOffset: 0, // Y offset for gun position (adjust as needed)
  });
  TankConfigRegistry.registerTankGun({
    id: "rapid_fire_color2",
    gunId: GUN_IDS.RAPID_FIRE,
    name: "Rapid Fire",
    gunTextureUrl: cannon1_1_c2,
    animationTextures: [cannon1_1_c2, cannon1_2_c2, cannon1_3_c2, cannon1_4_c2],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 800,
    fireRate: 3,
    damage: 8,
    bulletSpeed: 0.9,
  });
  TankConfigRegistry.registerTankGun({
    id: "rapid_fire_color3",
    gunId: GUN_IDS.RAPID_FIRE,
    name: "Rapid Fire",
    gunTextureUrl: cannon1_1_c3,
    animationTextures: [cannon1_1_c3, cannon1_2_c3, cannon1_3_c3, cannon1_4_c3],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 800,
    fireRate: 3,
    damage: 8,
    bulletSpeed: 0.9,
  });
  TankConfigRegistry.registerTankGun({
    id: "rapid_fire_color4",
    gunId: GUN_IDS.RAPID_FIRE,
    name: "Rapid Fire",
    gunTextureUrl: cannon1_1_c4,
    animationTextures: [cannon1_1_c4, cannon1_2_c4, cannon1_3_c4, cannon1_4_c4],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 800,
    fireRate: 3,
    damage: 8,
    bulletSpeed: 0.9,
  });

  // Cannon 2 - Balanced (All colors)
  TankConfigRegistry.registerTankGun({
    id: "balanced_color1",
    gunId: GUN_IDS.BALANCED,
    name: "Balanced",
    gunTextureUrl: cannon2_1_c1,
    animationTextures: [cannon2_1_c1, cannon2_2_c1, cannon2_3_c1, cannon2_4_c1],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1000,
    fireRate: 2, // Standard fire rate
    damage: 12, // Balanced damage
    bulletSpeed: 1.0,
    gunYOffset: 10, // Y offset for gun position (adjust as needed)
  });
  TankConfigRegistry.registerTankGun({
    id: "balanced_color2",
    gunId: GUN_IDS.BALANCED,
    name: "Balanced",
    gunTextureUrl: cannon2_1_c2,
    animationTextures: [cannon2_1_c2, cannon2_2_c2, cannon2_3_c2, cannon2_4_c2],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1000,
    fireRate: 2,
    damage: 12,
    bulletSpeed: 1.0,
  });
  TankConfigRegistry.registerTankGun({
    id: "balanced_color3",
    gunId: GUN_IDS.BALANCED,
    name: "Balanced",
    gunTextureUrl: cannon2_1_c3,
    animationTextures: [cannon2_1_c3, cannon2_2_c3, cannon2_3_c3, cannon2_4_c3],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1000,
    fireRate: 2,
    damage: 12,
    bulletSpeed: 1.0,
  });
  TankConfigRegistry.registerTankGun({
    id: "balanced_color4",
    gunId: GUN_IDS.BALANCED,
    name: "Balanced",
    gunTextureUrl: cannon2_1_c4,
    animationTextures: [cannon2_1_c4, cannon2_2_c4, cannon2_3_c4, cannon2_4_c4],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1000,
    fireRate: 2,
    damage: 12,
    bulletSpeed: 1.0,
  });

  // Cannon 3 - Heavy Cannon (All colors)
  TankConfigRegistry.registerTankGun({
    id: "heavy_cannon_color1",
    gunId: GUN_IDS.HEAVY_CANNON,
    name: "Heavy Cannon",
    gunTextureUrl: cannon3_1_c1,
    animationTextures: [cannon3_1_c1, cannon3_2_c1, cannon3_3_c1, cannon3_4_c1],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1500, // Long range
    fireRate: 1, // Slow fire rate
    damage: 20, // High damage
    bulletSpeed: 1.5, // Fast bullets
    gunYOffset: 0, // Y offset for gun position (adjust as needed)
  });
  TankConfigRegistry.registerTankGun({
    id: "heavy_cannon_color2",
    gunId: GUN_IDS.HEAVY_CANNON,
    name: "Heavy Cannon",
    gunTextureUrl: cannon3_1_c2,
    animationTextures: [cannon3_1_c2, cannon3_2_c2, cannon3_3_c2, cannon3_4_c2],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1500,
    fireRate: 1,
    damage: 20,
    bulletSpeed: 1.5,
  });
  TankConfigRegistry.registerTankGun({
    id: "heavy_cannon_color3",
    gunId: GUN_IDS.HEAVY_CANNON,
    name: "Heavy Cannon",
    gunTextureUrl: cannon3_1_c3,
    animationTextures: [cannon3_1_c3, cannon3_2_c3, cannon3_3_c3, cannon3_4_c3],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1500,
    fireRate: 1,
    damage: 20,
    bulletSpeed: 1.5,
  });
  TankConfigRegistry.registerTankGun({
    id: "heavy_cannon_color4",
    gunId: GUN_IDS.HEAVY_CANNON,
    name: "Heavy Cannon",
    gunTextureUrl: cannon3_1_c4,
    animationTextures: [cannon3_1_c4, cannon3_2_c4, cannon3_3_c4, cannon3_4_c4],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1500,
    fireRate: 1,
    damage: 20,
    bulletSpeed: 1.5,
  });

  // Cannon 4 - Sniper (All colors)
  TankConfigRegistry.registerTankGun({
    id: "sniper_color1",
    gunId: GUN_IDS.SNIPER,
    name: "Sniper",
    gunTextureUrl: cannon4_1_c1,
    animationTextures: [cannon4_1_c1, cannon4_2_c1, cannon4_3_c1, cannon4_4_c1],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1100,
    fireRate: 1.2, // Slow fire rate
    damage: 18, // High damage
    bulletSpeed: 1.1,
    gunYOffset: 20, // Y offset for gun position (adjust as needed)
  });
  TankConfigRegistry.registerTankGun({
    id: "sniper_color2",
    gunId: GUN_IDS.SNIPER,
    name: "Sniper",
    gunTextureUrl: cannon4_1_c2,
    animationTextures: [cannon4_1_c2, cannon4_2_c2, cannon4_3_c2, cannon4_4_c2],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1100,
    fireRate: 1.2,
    damage: 18,
    bulletSpeed: 1.1,
  });
  TankConfigRegistry.registerTankGun({
    id: "sniper_color3",
    gunId: GUN_IDS.SNIPER,
    name: "Sniper",
    gunTextureUrl: cannon4_1_c3,
    animationTextures: [cannon4_1_c3, cannon4_2_c3, cannon4_3_c3, cannon4_4_c3],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1100,
    fireRate: 1.2,
    damage: 18,
    bulletSpeed: 1.1,
  });
  TankConfigRegistry.registerTankGun({
    id: "sniper_color4",
    gunId: GUN_IDS.SNIPER,
    name: "Sniper",
    gunTextureUrl: cannon4_1_c4,
    animationTextures: [cannon4_1_c4, cannon4_2_c4, cannon4_3_c4, cannon4_4_c4],
    fireAnimationTextures: [fire1_1, fire1_2, fire1_3],
    scale: 1,
    range: 1100,
    fireRate: 1.2,
    damage: 18,
    bulletSpeed: 1.1,
  });
}

/**
 * Example usage:
 *
 * import { initializeTankRegistry } from "./TankRegistry";
 * import { Tank1 } from "./Tank1";
 *
 * // Initialize registry at startup
 * initializeTankRegistry();
 *
 * // Create a tank
 * const tank = await Tank1.create({
 *   baseId: "scout_tank_color1",
 *   gunId: "rapid_fire_color1", // Gun ID includes color
 *   initialX: 100,
 *   initialY: 100,
 *   scale: 1,
 *   username: "Player1",
 *   // Optional overrides
 *   customTankSpeed: 1.5,
 *   customGunRange: 1500,
 *   customFireRate: 3,
 *   customDamage: 20,
 *   customBulletSpeed: 1.5,
 * });
 */
