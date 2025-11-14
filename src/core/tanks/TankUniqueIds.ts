/**
 * Unique Tank and Gun IDs Configuration
 *
 * This file defines unique identifiers for tank bases and guns
 * that are independent of color variants. Each tank base and gun
 * has a unique ID regardless of color.
 */

/**
 * Unique Tank Base IDs
 * These IDs are used to identify tank types regardless of color
 */
export const TANK_BASE_IDS = {
  SCOUT_TANK: "scout_tank",
  LIGHT_TANK: "light_tank",
  HEAVY_TANK: "heavy_tank",
  MEDIUM_TANK: "medium_tank",
} as const;

/**
 * Unique Gun IDs
 * These IDs are used to identify gun types regardless of color
 */
export const GUN_IDS = {
  RAPID_FIRE: "rapid_fire",
  BALANCED: "balanced",
  HEAVY_CANNON: "heavy_cannon",
  SNIPER: "sniper",
} as const;

/**
 * Type for tank base unique IDs
 */
export type TankBaseUniqueId =
  (typeof TANK_BASE_IDS)[keyof typeof TANK_BASE_IDS];

/**
 * Type for gun unique IDs
 */
export type GunUniqueId = (typeof GUN_IDS)[keyof typeof GUN_IDS];

/**
 * Helper function to extract unique base ID from full ID
 * e.g., "scout_tank_color1" -> "scout_tank"
 * Also supports old format: "tank1_color1" -> "scout_tank"
 */
export function getUniqueBaseId(fullId: string): string {
  // New format
  if (fullId.startsWith("scout_tank")) return TANK_BASE_IDS.SCOUT_TANK;
  if (fullId.startsWith("light_tank")) return TANK_BASE_IDS.LIGHT_TANK;
  if (fullId.startsWith("heavy_tank")) return TANK_BASE_IDS.HEAVY_TANK;
  if (fullId.startsWith("medium_tank")) return TANK_BASE_IDS.MEDIUM_TANK;
  // Old format (backward compatibility)
  if (fullId.startsWith("tank1")) return TANK_BASE_IDS.SCOUT_TANK;
  if (fullId.startsWith("tank2")) return TANK_BASE_IDS.LIGHT_TANK;
  if (fullId.startsWith("tank3")) return TANK_BASE_IDS.HEAVY_TANK;
  if (fullId.startsWith("tank4")) return TANK_BASE_IDS.MEDIUM_TANK;
  return fullId; // Fallback
}

/**
 * Helper function to extract unique gun ID from full ID
 * e.g., "rapid_fire_color1" -> "rapid_fire"
 * Also supports old format: "cannon1_color1" -> "rapid_fire"
 */
export function getUniqueGunId(fullId: string): string {
  // New format
  if (fullId.startsWith("rapid_fire")) return GUN_IDS.RAPID_FIRE;
  if (fullId.startsWith("balanced")) return GUN_IDS.BALANCED;
  if (fullId.startsWith("heavy_cannon")) return GUN_IDS.HEAVY_CANNON;
  if (fullId.startsWith("sniper")) return GUN_IDS.SNIPER;
  // Old format (backward compatibility)
  if (fullId.startsWith("cannon1")) return GUN_IDS.RAPID_FIRE;
  if (fullId.startsWith("cannon2")) return GUN_IDS.BALANCED;
  if (fullId.startsWith("cannon3")) return GUN_IDS.HEAVY_CANNON;
  if (fullId.startsWith("cannon4")) return GUN_IDS.SNIPER;
  return fullId; // Fallback
}

/**
 * Helper function to get tank base ID from index and color
 * @param baseIndex - 1-4 (1=Scout, 2=Light, 3=Heavy, 4=Medium)
 * @param colorIndex - 1-4
 * @returns Full ID like "scout_tank_color1"
 */
export function getTankBaseIdFromIndex(
  baseIndex: number,
  colorIndex: number
): string {
  const baseNames = ["scout_tank", "light_tank", "heavy_tank", "medium_tank"];
  const baseName = baseNames[baseIndex - 1] || baseNames[0];
  return `${baseName}_color${colorIndex}`;
}

/**
 * Helper function to get gun ID from index and color
 * @param gunIndex - 1-4 (1=Rapid Fire, 2=Balanced, 3=Heavy Cannon, 4=Sniper)
 * @param colorIndex - 1-4
 * @returns Full ID like "rapid_fire_color1"
 */
export function getGunIdFromIndex(
  gunIndex: number,
  colorIndex: number
): string {
  const gunNames = ["rapid_fire", "balanced", "heavy_cannon", "sniper"];
  const gunName = gunNames[gunIndex - 1] || gunNames[0];
  return `${gunName}_color${colorIndex}`;
}
