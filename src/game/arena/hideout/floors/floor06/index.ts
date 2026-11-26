import * as THREE from 'three';
import { buildAmmoCratesFromSpecs } from '../../../props/ammoCrates';
import { buildTargetsFromSpecs } from '../../../props/targets';
import type { HideoutMaterialRegistry } from '../../materials';
import type { FloorGeometryCollector } from '../../stairs';
import type { FloorBuildResult, OcclusionCell } from '../../types';
import {
  F6_BASE_Y,
  F6_BOUNDS,
  F6_ENTRY_THRESHOLD,
  F6_META,
  F6_SPAWN,
  F6_TRENCH_Y,
  F6_UPPER_Y,
} from './layout';
import { buildFloor6Zone1SouthArrival } from './zone1SouthArrival';
import { buildFloor6Zone2MonolithCathedral } from './zone2MonolithCathedral';
import { buildFloor6Zone3WestBlackSiteLabs } from './zone3WestBlackSiteLabs';
import { buildFloor6Zone4EastBallisticFoundry } from './zone4EastBallisticFoundry';
import { buildFloor6Zone5SouthWestArmoryBunker } from './zone5SouthWestArmoryBunker';
import { buildFloor6Zone6NorthEastGravCore } from './zone6NorthEastGravCore';
import { buildFloor6Zone7NorthWestCryoVault } from './zone7NorthWestCryoVault';
import { buildFloor6Zone8NorthExtraction } from './zone8NorthExtraction';

/**
 * FLOOR 06 (Y = 70.0m) — OBSIDIAN MONOLITH ARCHIVE & BALLISTIC LABS
 *
 * A massive `88m × 56m` AAA 8-zone multi-tier world inspired by Control's Oldest House,
 * Halo's Forerunner Sanctum, Call of Duty Black-Site Labs & Cyberpunk 2077:
 * 1. Zone 1 (South): Arrival Security Vestibule (`z = +17.0` aligned seamlessly with Floor 07's South Descent Gallery)
 * 2. Zone 2 (Center Hero): 13.4m Suspended Monolith Cathedral with 6 brutalist hanging data monoliths,
 *    a `-2.4m` Sunken Dry Cooling Trench (`y = 67.6m`), counter-rotating Obsidian Relic Halo, twin glass cross-bridges,
 *    twin flush trench stairs, twin grand stairs, Retractable High Skybridge (dual `[E]` switch + shootable relay),
 *    and twin calibrated Pneumatic Jump Pads!
 * 3. Zone 3 (West OcclusionCell): Black-Site Tactical Labs with glass Cleanroom Pod, Upper Observation Catwalk,
 *    flush West wall stair, calibrated Jump Pad & Jammed Roll-Under Blast Shutter!
 * 4. Zone 4 (East OcclusionCell): Ballistic Containment Foundry & Forge with 4 Crucible Pylons, flush East wall stair,
 *    Retractable Foundry Skybridge (dual `[E]` switch + shootable crane relay) & Jammed Roll-Under Shutter!
 * 5. Zone 5 (South-West OcclusionCell): Armored Data Bunker & Sealed Munitions Vault unlocked by sniping the
 *    glowing crimson Relay Lock straight through the ballistic observation window!
 * 6. Zone 6 (North-East OcclusionCell): Forerunner Grav-Core Test Chamber with Triple Counter-Rotating Gyro Rings,
 *    plasma containment beam, continuous Upper Halo Gallery & calibrated North Jump Pad!
 * 7. Zone 7 (North-West OcclusionCell): Sub-Zero Cryo Memory Sanctum with 4 frosted Cryo Monoliths, overhead
 *    counter-rotating exhaust fans, flush East stair & Shootable Extraction Bypass Gate!
 * 8. Zone 8 (North): Archive Extraction Concourse, Elevated Overlook Bridge, Control Center & Massive Exit Bulkhead 06!
 */
export function buildFloor6Complex(mats: HideoutMaterialRegistry): FloorBuildResult {
  const baseY = F6_BASE_Y; // 70.0m
  const trenchY = F6_TRENCH_Y; // 67.6m
  const upperY = F6_UPPER_Y; // 74.4m

  const group = new THREE.Group();
  group.name = 'FLOOR_06_OBSIDIAN_MONOLITH_ARCHIVE';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'FLOOR_06_DETAIL';
  group.add(detailGroup);

  const collector: FloorGeometryCollector = {
    group,
    boxes: [],
    slabs: [],
    ramps: [],
    arcRamps: [],
    ringSlabs: [],
    wallMeshes: [],
    tacticalDoors: [],
    retractableBridges: [],
    securityGates: [],
    shootableLocks: [],
    jumpPads: [],
    worldSwitches: [],
    explosiveBarrels: [],
    animatedSpinners: [],
  };

  // Assemble all 8 modular architectural combat zones!
  const arrivalDoor = buildFloor6Zone1SouthArrival(collector, detailGroup, mats);
  buildFloor6Zone2MonolithCathedral(collector, detailGroup, mats);
  const westLabsCell = buildFloor6Zone3WestBlackSiteLabs(collector, mats);
  const eastFoundryCell = buildFloor6Zone4EastBallisticFoundry(collector, mats);
  const swBunkerCell = buildFloor6Zone5SouthWestArmoryBunker(collector, mats);
  const neGravCoreCell = buildFloor6Zone6NorthEastGravCore(collector, mats);
  const nwCryoVaultCell = buildFloor6Zone7NorthWestCryoVault(collector, mats);
  const extraction = buildFloor6Zone8NorthExtraction(collector, detailGroup, mats);

  const occlusionCells: OcclusionCell[] = [
    westLabsCell,
    eastFoundryCell,
    swBunkerCell,
    neGravCoreCell,
    nwCryoVaultCell,
  ];

  // 26+ Reactive Targets distributed across EVERY zone and ALL 3 vertical elevation tiers (67.6m, 70.0m, 74.4m)!
  const targetsRes = buildTargetsFromSpecs(group, {
    dummies: [
      // Zone 2 Monolith Cathedral (Sunken Trench, Main Promenades & Upper Galleries)
      { id: 'f6_cathedral_trench_n', x: 0.0, y: trenchY, z: -5.6 },
      { id: 'f6_cathedral_trench_s', x: 0.0, y: trenchY, z: 5.6 },
      { id: 'f6_cathedral_upper_w', x: -15.4, y: upperY, z: -3.2 },
      { id: 'f6_cathedral_upper_e', x: 15.4, y: upperY, z: -3.2 },
      { id: 'f6_cathedral_overlook_n', x: 6.2, y: upperY, z: -12.2 },
      // Zone 3 West Black-Site Labs
      { id: 'f6_labs_cleanroom', x: -29.0, y: baseY, z: 2.4 },
      { id: 'f6_labs_catwalk', x: -30.5, y: upperY, z: 4.2 },
      // Zone 4 East Ballistic Foundry
      { id: 'f6_foundry_ground_n', x: 31.0, y: baseY, z: 1.0 },
      { id: 'f6_foundry_ground_s', x: 31.0, y: baseY, z: 7.4 },
      { id: 'f6_foundry_spine_e', x: 41.0, y: upperY, z: -2.0 },
      // Zone 5 SW Armored Bunker & Munitions Vault
      { id: 'f6_bunker_corridor', x: -27.6, y: baseY, z: 21.0 },
      { id: 'f6_bunker_vault_guard', x: -39.6, y: baseY, z: 18.0 },
      // Zone 6 NE Grav-Core Test Chamber
      { id: 'f6_grav_ground_w', x: 24.4, y: baseY, z: -19.8 },
      { id: 'f6_grav_gallery_n', x: 34.4, y: upperY, z: -25.6 },
      // Zone 7 NW Cryo Memory Sanctum
      { id: 'f6_cryo_ground_1', x: -30.8, y: baseY, z: -13.6 },
      { id: 'f6_cryo_catwalk_w', x: -41.0, y: upperY, z: -18.0 },
    ],
    steelPlates: [
      { id: 'f6_plate_cathedral_nw', x: -7.8, y: baseY, z: -13.8 },
      { id: 'f6_plate_cathedral_ne', x: 7.8, y: baseY, z: -13.8 },
      { id: 'f6_plate_foundry_s', x: 23.4, y: baseY, z: 13.6 },
      { id: 'f6_plate_cryo_n', x: -36.8, y: baseY, z: -24.8 },
    ],
    canisters: [
      { id: 'f6_can_trench_w', x: -7.6, y: trenchY, z: 0.0 },
      { id: 'f6_can_trench_e', x: 7.6, y: trenchY, z: 0.0 },
      { id: 'f6_can_labs_s', x: -21.8, y: baseY, z: 7.2 },
      { id: 'f6_can_foundry_c', x: 35.0, y: baseY, z: 4.2 },
      { id: 'f6_can_grav_e', x: 36.8, y: baseY, z: -20.6 },
      { id: 'f6_can_cryo_c', x: -27.4, y: baseY, z: -17.0 },
    ],
    drones: [
      // Patrolling drones soaring through the Monolith Cathedral, East Foundry & Grav-Core!
      { id: 'f6_drone_cathedral_low', x: 0.0, y: baseY + 2.6, z: -1.8, amp: 4.8, phase: 0.0, axis: 'x' },
      { id: 'f6_drone_cathedral_high', x: 0.0, y: upperY + 2.4, z: 3.4, amp: 7.2, phase: 1.7, axis: 'x' },
      { id: 'f6_drone_foundry', x: 31.0, y: baseY + 5.6, z: 4.2, amp: 5.2, phase: 0.8, axis: 'z' },
      { id: 'f6_drone_grav_core', x: 31.0, y: baseY + 8.6, z: -16.8, amp: 5.4, phase: 2.3, axis: 'x' },
    ],
  });

  // 8 Heavy .50 HV Ammo Crates (including 2 high-reward crates inside SW Locked Munitions Vault!)
  const cratesRes = buildAmmoCratesFromSpecs(group, [
    { id: 'f6_crate_arrival_e', x: 14.6, y: baseY, z: 14.6, rotY: -0.4 },
    { id: 'f6_crate_trench_center', x: 0.0, y: trenchY, z: 0.0, rotY: 0.0 },
    { id: 'f6_crate_cathedral_upper_n', x: -6.4, y: upperY, z: -12.8, rotY: 0.25 },
    { id: 'f6_crate_labs_cleanroom', x: -29.0, y: baseY, z: -0.2, rotY: 0.0 },
    { id: 'f6_crate_foundry_spine', x: 41.2, y: upperY, z: -5.4, rotY: -0.4 },
    // High-Reward Locked Munitions Vault Crates (reward for sniping f6_lock_sw_vault through glass!)
    { id: 'f6_crate_sw_vault_1', x: -40.2, y: baseY, z: 20.8, rotY: 0.35 },
    { id: 'f6_crate_sw_vault_2', x: -39.4, y: baseY, z: 23.8, rotY: -0.3 },
    { id: 'f6_crate_grav_gallery', x: 20.8, y: upperY, z: -25.6, rotY: 0.4 },
    { id: 'f6_crate_cryo_overlook', x: -35.4, y: upperY, z: -26.0, rotY: -0.25 },
  ]);

  return {
    meta: F6_META,
    group,
    detailGroup,
    occlusionCells,
    boxes: collector.boxes,
    slabs: collector.slabs,
    ramps: collector.ramps,
    arcRamps: collector.arcRamps,
    ringSlabs: collector.ringSlabs,
    wallMeshes: collector.wallMeshes,
    targets: targetsRes.targets,
    targetHitboxes: targetsRes.targetHitboxes,
    ammoCrates: cratesRes.crates,
    arrivalDoor,
    exitDoor: extraction.exitDoor,
    tacticalDoors: collector.tacticalDoors,
    retractableBridges: collector.retractableBridges,
    securityGates: collector.securityGates,
    shootableLocks: collector.shootableLocks,
    jumpPads: collector.jumpPads,
    worldSwitches: collector.worldSwitches,
    explosiveBarrels: collector.explosiveBarrels,
    animatedSpinners: collector.animatedSpinners,
    controlCenter: extraction.controlCenter,
    lightPreset: {
      hemiSky: 0xa5d8ff,
      hemiGround: 0x1e2638,
      hemiIntensity: 1.06,
      keyColor: 0xeaf4ff,
      keyIntensity: 2.38,
      keyOffset: [12, 15, -10],
      fillColor: 0x38bdf8,
      fillIntensity: 0.86,
      fogColor: 0x0a111d,
      fogDensity: 0.0076,
      // 4 pooled high-contrast accent lights across Cathedral Relic, West Labs, East Foundry & Grav-Core/Extraction!
      pointLights: [
        { x: 0, yOffset: 4.8, z: 0, color: 0x38bdf8, intensity: 26, distance: 38 },
        { x: -31.0, yOffset: 5.8, z: 4.0, color: 0xf59e0b, intensity: 21, distance: 38 },
        { x: 31.0, yOffset: 6.2, z: 2.0, color: 0xf97316, intensity: 22, distance: 38 },
        { x: 31.0, yOffset: 6.4, z: -17.0, color: 0xa855f7, intensity: 22, distance: 38 },
      ],
    },
    spawnPoint: { ...F6_SPAWN },
    bounds: { ...F6_BOUNDS },
    entryThreshold: { ...F6_ENTRY_THRESHOLD },
    dispose: () => {
      targetsRes.dispose();
      cratesRes.dispose();
    },
  };
}
