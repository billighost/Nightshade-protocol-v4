import * as THREE from 'three';
import { buildAmmoCratesFromSpecs } from '../../../props/ammoCrates';
import { buildTargetsFromSpecs } from '../../../props/targets';
import type { HideoutMaterialRegistry } from '../../materials';
import type { FloorGeometryCollector } from '../../stairs';
import type { FloorBuildResult, OcclusionCell } from '../../types';
import {
  F3_BOUNDS,
  F3_ENTRY_THRESHOLD,
  F3_L0_Y,
  F3_L1_Y,
  F3_L2_Y,
  F3_META,
  F3_SPAWN,
  F3_SUB_Y,
} from './layout';
import { buildFloor3Zone1SealedThreshold } from './zone1SealedThreshold';
import { buildFloor3Zone2ObsidianCloister } from './zone2ObsidianCloister';
import { buildFloor3Zone3WestZiggurat } from './zone3WestZiggurat';
import { buildFloor3Zone4NorthWestAqueduct } from './zone4NorthWestAqueduct';
import { buildFloor3Zone5FarNorthWestCrypt } from './zone5FarNorthWestCrypt';
import { buildFloor3Zone7NorthEastArchive } from './zone7NorthEastArchive';
import { buildFloor3Zone8FarNorthEastSpire } from './zone8FarNorthEastSpire';
import { buildFloor3Zone9EastMonolithConduit } from './zone9EastMonolithConduit';
import { buildFloor3Zone10SouthWestCavern } from './zone10SouthWestCavern';
import { buildFloor3Zone11SouthEastReliquary } from './zone11SouthEastReliquary';
import { buildFloor3Zone12SouthExtraction } from './zone12SouthExtraction';

/**
 * FLOOR 03 (Y = 28.0m) — THE GLACIAL FORERUNNER CITADEL & SUNKEN OBSIDIAN TEMPLE COMPLEX
 *
 * A colossal `108m × 68m` (7,344 m²) 12-zone, TRUE 3-STORY + SUB-CRYPT ancient megalithic citadel
 * that completely reinvents the spatial formula for the final 3 floors:
 * - NO central arena: Spawn inside Zone 1 (Sealed Arrival Threshold Vestibule) with twin overhead L1/L2
 *   sky-galleries and an interactive threshold puzzle (shoot Cryo-Resonator OR activate Keystone `[E]`)
 *   to breach into Zone 2's tight, arched 3-story Obsidian Cloister Passages & Rotating Glacial Astrolabe!
 * - TRUE 3 FULL PLAYABLE VERTICAL LEVELS (`28.0m → 31.1m → 34.2m`, plus `26.2m` Sunken Cryo Sub-Crypts)
 *   featuring BOTH Two-Stage Stepped Ascents (`L0→L1→walk→L1→L2`) AND twin `12.0m` Express Grand Temple
 *   Staircases (`L0→L2`), Monumental Double-Helix Spiral Staircases (`L0→L1→L2` in Zone 5), 3 Retractable
 *   Level 2 Skybridges, 2 Jammed Roll-Under Ice-Blast Shutters, 3 Locked Security Gates & 6 Calibrated
 *   Multi-Tier Jump Pads (including TWO Express `L0→L2` Super Cryo-Lifts!).
 * - Remote Level 2 Master Control Sanctum: Floor 03's Master Control Center (`[E]`) sits FAR AWAY atop
 *   the Level 2 Obsidian-Gold Throne Dais (`45.5, 34.2, 24.0`) inside Zone 11 (SE Grand Crown Reliquary)!
 */
export function buildFloor3Complex(mats: HideoutMaterialRegistry): FloorBuildResult {
  const ySub = F3_SUB_Y; // 26.2m
  const y0 = F3_L0_Y; // 28.0m
  const y1 = F3_L1_Y; // 31.1m
  const y2 = F3_L2_Y; // 34.2m

  const group = new THREE.Group();
  group.name = 'FLOOR_03_GLACIAL_FORERUNNER_CITADEL';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'FLOOR_03_DETAIL';
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

  // Assemble Core Spine (Always Visible: Zones 1, 2, 12) + 8 Sprawling Outer Citadel OcclusionCells!
  const arrivalDoor = buildFloor3Zone1SealedThreshold(collector, detailGroup, mats);
  buildFloor3Zone2ObsidianCloister(collector, detailGroup, mats);
  const exitDoor = buildFloor3Zone12SouthExtraction(collector, detailGroup, mats);

  // West Citadel (4 OcclusionCells)
  const zone3Ziggurat = buildFloor3Zone3WestZiggurat(collector, mats);
  const zone4Aqueduct = buildFloor3Zone4NorthWestAqueduct(collector, mats);
  const zone5Crypt = buildFloor3Zone5FarNorthWestCrypt(collector, mats);
  const zone10Cavern = buildFloor3Zone10SouthWestCavern(collector, mats);

  // East Citadel (4 OcclusionCells, including Remote Level 2 Master Control Center in Zone 11!)
  const zone7Archive = buildFloor3Zone7NorthEastArchive(collector, mats);
  const zone8Spire = buildFloor3Zone8FarNorthEastSpire(collector, mats);
  const zone9Monolith = buildFloor3Zone9EastMonolithConduit(collector, mats);
  const reliquary = buildFloor3Zone11SouthEastReliquary(collector, mats);

  const occlusionCells: OcclusionCell[] = [
    zone3Ziggurat,
    zone4Aqueduct,
    zone5Crypt,
    zone10Cavern,
    zone7Archive,
    zone8Spire,
    zone9Monolith,
    reliquary.cell,
  ];

  // 42 Reactive Targets across ALL 12 zones & ALL 4 elevation tiers (`26.2m, 28.0m, 31.1m, 34.2m`)!
  const targetsRes = buildTargetsFromSpecs(group, {
    dummies: [
      // Zone 2 Obsidian Cloister (L0, L1, L2)
      { id: 'f3_cloister_l0_w', x: -6.8, y: y0, z: 2.5 },
      { id: 'f3_cloister_l0_e', x: 6.8, y: y0, z: 2.5 },
      { id: 'f3_cloister_l1_n', x: 0.0, y: y1, z: -2.2 },
      { id: 'f3_cloister_l2_s', x: -3.2, y: y2, z: 7.4 },
      // Zone 3 West Basalt Ziggurat (L0, L1, L2)
      { id: 'f3_zig_l0_e', x: -18.5, y: y0, z: 1.5 },
      { id: 'f3_zig_l1_s', x: -33.0, y: y1, z: 7.2 },
      { id: 'f3_zig_l2_w', x: -48.0, y: y2, z: 2.5 },
      // Zone 4 NW Frost Aqueduct (L0, L1, L2)
      { id: 'f3_aq_l0', x: -25.0, y: y0, z: -21.0 },
      { id: 'f3_aq_l1', x: -24.0, y: y1, z: -29.0 },
      { id: 'f3_aq_l2', x: -24.0, y: y2, z: -8.0 },
      // Zone 5 Far NW Glacial Crypt (L0, L1, L2)
      { id: 'f3_crypt_l0', x: -49.5, y: y0, z: -10.5 },
      { id: 'f3_crypt_l1', x: -38.0, y: y1, z: -28.0 },
      { id: 'f3_crypt_l2', x: -46.5, y: y2, z: -9.5 },
      // Zone 7 NE Prism Archive (L0, L1, L2)
      { id: 'f3_arch_l0', x: 25.0, y: y0, z: -22.0 },
      { id: 'f3_arch_l1', x: 22.0, y: y1, z: -9.5 },
      { id: 'f3_arch_l2', x: 26.0, y: y2, z: -30.5 },
      // Zone 8 Far NE Aurora Spire (L0, L1, L2)
      { id: 'f3_spire_l0', x: 48.0, y: y0, z: -14.0 },
      { id: 'f3_spire_l1', x: 39.0, y: y1, z: -27.2 },
      { id: 'f3_spire_l2', x: 46.5, y: y2, z: -10.0 },
      // Zone 9 East Monolith Conduit (L0, L1, L2)
      { id: 'f3_mono_l0', x: 22.0, y: y0, z: 2.5 },
      { id: 'f3_mono_l1', x: 32.0, y: y1, z: 7.2 },
      { id: 'f3_mono_l2', x: 48.0, y: y2, z: 2.5 },
      // Zone 10 SW Sunken Crystal Cavern (Sub-Crypt, L0, L2)
      { id: 'f3_cavern_sub', x: -34.0, y: ySub, z: 19.5 },
      { id: 'f3_cavern_l0', x: -20.0, y: y0, z: 21.0 },
      { id: 'f3_cavern_l2', x: -30.0, y: y2, z: 13.2 },
      // Zone 11 SE Grand Crown Reliquary (L0, L1, L2 Throne Dais!)
      { id: 'f3_rel_l0', x: 18.0, y: y0, z: 26.0 },
      { id: 'f3_rel_l1', x: 46.0, y: y1, z: 21.5 },
      { id: 'f3_rel_l2_guard', x: 44.5, y: y2, z: 18.5 },
    ],
    steelPlates: [
      { id: 'f3_plate_z1_l2', x: 0.0, y: y2, z: -9.5 },
      { id: 'f3_plate_z3_l2', x: -24.0, y: y2, z: -2.0 },
      { id: 'f3_plate_z9_l2', x: 24.0, y: y2, z: -2.0 },
      { id: 'f3_plate_z11_l2', x: 48.5, y: y2, z: 29.0 },
      { id: 'f3_plate_z12_l2', x: 0.0, y: y2, z: 12.8 },
    ],
    canisters: [
      { id: 'f3_can_z4', x: -18.5, y: y0, z: -28.0 },
      { id: 'f3_can_z5', x: -49.5, y: y0, z: -27.5 },
      { id: 'f3_can_z7', x: 18.5, y: y0, z: -28.5 },
      { id: 'f3_can_z10', x: -28.0, y: ySub, z: 24.0 },
      { id: 'f3_can_z11', x: 30.0, y: ySub, z: 19.0 },
    ],
    drones: [
      // 4 Patrolling Sentinel Drones across Ziggurat, Monolith Conduit, Crystal Cavern & Grand Reliquary!
      { id: 'f3_drone_z3', x: -33.0, y: y1 + 3.4, z: 2.5, amp: 8.5, phase: 0.0, axis: 'x' },
      { id: 'f3_drone_z9', x: 33.0, y: y1 + 3.4, z: 2.5, amp: 8.5, phase: 1.5, axis: 'x' },
      { id: 'f3_drone_z10', x: -32.5, y: y1 + 2.2, z: 21.0, amp: 7.0, phase: 2.4, axis: 'x' },
      { id: 'f3_drone_z11', x: 30.0, y: y2 + 1.8, z: 21.5, amp: 6.5, phase: 0.7, axis: 'x' },
    ],
  });

  // 12 High-Value .50 HV Heavy Ammo Crates (including 2 inside the Sealed SW Frozen Armory Vault!)
  const cratesRes = buildAmmoCratesFromSpecs(group, [
    { id: 'f3_crate_z1_vestibule', x: -7.6, y: y0, z: -13.6, rotY: 0.35 },
    { id: 'f3_crate_z2_l1', x: -9.8, y: y1, z: 3.5, rotY: 0.2 },
    { id: 'f3_crate_z3_l2', x: -50.8, y: y2, z: -1.6, rotY: 0.3 },
    { id: 'f3_crate_z4_l2', x: -16.2, y: y2, z: -30.8, rotY: -0.25 },
    { id: 'f3_crate_z5_l1', x: -50.8, y: y1, z: -29.5, rotY: 0.35 },
    { id: 'f3_crate_z7_l2', x: 28.5, y: y2, z: -30.5, rotY: -0.3 },
    { id: 'f3_crate_z8_l2', x: 49.5, y: y2, z: -8.5, rotY: -0.2 },
    { id: 'f3_crate_z9_l2', x: 50.8, y: y2, z: -1.6, rotY: -0.35 },
    // High-Reward Sealed Frozen Armory Vault Crates (reward for sniping f3_lock_crystal_vault!)
    { id: 'f3_crate_z10_vault_1', x: -51.4, y: y0, z: 26.8, rotY: 0.25 },
    { id: 'f3_crate_z10_vault_2', x: -51.4, y: y0, z: 30.8, rotY: -0.25 },
    // Grand Crown Reliquary L1 & L2 Throne Supply Crates
    { id: 'f3_crate_z11_l1', x: 49.5, y: y1, z: 29.0, rotY: -0.3 },
    { id: 'f3_crate_z11_l2_throne', x: 50.8, y: y2, z: 19.5, rotY: -0.4 },
  ]);

  return {
    meta: F3_META,
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
    exitDoor,
    tacticalDoors: collector.tacticalDoors,
    retractableBridges: collector.retractableBridges,
    securityGates: collector.securityGates,
    shootableLocks: collector.shootableLocks,
    jumpPads: collector.jumpPads,
    worldSwitches: collector.worldSwitches,
    explosiveBarrels: collector.explosiveBarrels,
    animatedSpinners: collector.animatedSpinners,
    controlCenter: reliquary.controlCenter,
    lightPreset: {
      // Distinct Ancient Glacial-Forerunner Temple lighting: cool starlight-ice sky, deep obsidian ground, warm aurora-gold key!
      hemiSky: 0xd8f3ff,
      hemiGround: 0x111a2b,
      hemiIntensity: 1.18,
      keyColor: 0xfff0d4,
      keyIntensity: 2.38,
      keyOffset: [12, 16, -12],
      fillColor: 0x38bdf8,
      fillIntensity: 0.98,
      fogColor: 0x0b1322,
      fogDensity: 0.0062,
      // 4 pooled high-contrast temple accent lights (Obsidian Cloister, Glacial Crypt, Aurora Spire & Crown Reliquary!)
      pointLights: [
        { x: 0.0, yOffset: 4.8, z: 2.5, color: 0x67e8f9, intensity: 28, distance: 46 },
        { x: -43.0, yOffset: 5.5, z: -19.0, color: 0x22d3ee, intensity: 26, distance: 46 },
        { x: 43.0, yOffset: 5.5, z: -19.0, color: 0xf59e0b, intensity: 26, distance: 46 },
        { x: 38.0, yOffset: 6.2, z: 22.0, color: 0xe6ad46, intensity: 30, distance: 50 },
      ],
    },
    spawnPoint: { ...F3_SPAWN },
    bounds: { ...F3_BOUNDS },
    entryThreshold: { ...F3_ENTRY_THRESHOLD },
    dispose: () => {
      targetsRes.dispose();
      cratesRes.dispose();
    },
  };
}
