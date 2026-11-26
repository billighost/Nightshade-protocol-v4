/**
 * Modular Gunsmith Weapon Facade.
 * Each firearm lives in its own dedicated folder with carefully engineered mechanical subassemblies:
 * - `src/game/weapons/spectre9/` — SPECTRE-9 Suppressed Tactical Sidearm
 * - `src/game/weapons/viperX4/`  — VIPER-X4 Tactical Rail-SMG / PDW
 * - `src/game/weapons/vulcan50/` — VULCAN-50 Heavy .50-Cal Kinetic Battle Rifle
 * - `src/game/weapons/materials.ts` — Shared procedural PBR gunsmith materials & reticles
 */
export { createSpectrePistol, type SpectrePistolRig } from './spectre9';
export { createViperSmg, type ViperSmgRig } from './viperX4';
export { createVulcanHeavy, type VulcanHeavyRig } from './vulcan50';
