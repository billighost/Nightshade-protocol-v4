import * as THREE from 'three';
import { buildAmmoCratesFromSpecs } from '../../../props/ammoCrates';
import { buildTargetsFromSpecs } from '../../../props/targets';
import type { HideoutMaterialRegistry } from '../../materials';
import type { FloorGeometryCollector } from '../../stairs';
import type { FloorBuildResult, OcclusionCell } from '../../types';
import {
  F2_BOUNDS,
  F2_ENTRY_THRESHOLD,
  F2_L0_Y,
  F2_L1_Y,
  F2_L2_Y,
  F2_META,
  F2_SPAWN,
} from './layout';
import { buildFloor2Zone1CustomsAirlock } from './zone1CustomsAirlock';
import { buildFloor2Zone2MaglevConcourse } from './zone2MaglevConcourse';
import { buildFloor2Zone3WestSmelterFoundry } from './zone3WestSmelterFoundry';
import { buildFloor2Zone4SouthWestForgeYard } from './zone4SouthWestForgeYard';
import { buildFloor2Zone5FarSouthWestSlagSilo } from './zone5FarSouthWestSlagSilo';
import { buildFloor2Zone6SouthEastRailDepot } from './zone6SouthEastRailDepot';
import { buildFloor2Zone8FarSouthEastCoolingSilo } from './zone8FarSouthEastCoolingSilo';
import { buildFloor2Zone9EastLocomotiveBay } from './zone9EastLocomotiveBay';
import { buildFloor2Zone10NorthWestSignalTower } from './zone10NorthWestSignalTower';
import { buildFloor2Zone11NorthEastCyberBazaar } from './zone11NorthEastCyberBazaar';
import { buildFloor2Zone12NorthExtraction } from './zone12NorthExtraction';

/**
 * FLOOR 02 (Y = 14.0m) — THE VOLTAIC MAGLEV METROPOLIS & SMELTER SKY-YARD
 *
 * A colossal `112m × 68m` (7,616 m²) 12-zone, TRUE 3-STORY + INDUCTIVE RAIL CHANNEL cyber-industrial
 * subterranean rail city & molten alloy foundry:
 * - NO central arena: Spawn South inside Zone 1 (Sealed Freight Customs Airlock) with twin overhead
 *   L1/L2 sky-overpasses and an opening breach puzzle (shoot Crimson Breaker Relay OR flip `[E]`
 *   Customs Override) into Zone 2's narrow 3-story Maglev Rail Canyon with a composite Freight Locomotive!
 * - TRUE 3 FULL PLAYABLE VERTICAL LEVELS (`14.0m -> 17.1m -> 20.2m`, plus `13.6m` Inductive Track Bed)
 *   featuring Two-Stage Stepped Ascents, twin `12.0m` Express Grand Industrial Staircases (`L0 -> L2`),
 *   a Monumental Stacked Double-Helix Curved Spiral Cooling Silo (Zone 8), 3 Retractable Level 2
 *   Skybridges, 2 Jammed Roll-Under Blast Shutters, 3 Locked Security Gates (Customs Seal, through-glass
 *   Black-Market Munitions Vault, Signal Tower Bypass) & 6 Calibrated Pneumatic Jump Pads (including
 *   TWO Express `L0 -> L2` Super-Lifts!).
 * - Remote Level 2 Master Dispatch Spire: Floor 02's Master Control Center (`[E]`) sits FAR AWAY atop
 *   the Level 2 Command Dais (`-46.5, 20.2, -24.5`) inside Zone 10 (NW High-Voltage Signal Control Tower)!
 */
export function buildFloor2Complex(mats: HideoutMaterialRegistry): FloorBuildResult {
  const y0 = F2_L0_Y; // 14.0m
  const y1 = F2_L1_Y; // 17.1m
  const y2 = F2_L2_Y; // 20.2m

  const group = new THREE.Group();
  group.name = 'FLOOR_02_VOLTAIC_MAGLEV_METROPOLIS';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'FLOOR_02_DETAIL';
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

  // Core Spine (Always Visible: Zones 1, 2, 12)
  const arrivalDoor = buildFloor2Zone1CustomsAirlock(collector, detailGroup, mats);
  buildFloor2Zone2MaglevConcourse(collector, detailGroup, mats);
  const exitDoor = buildFloor2Zone12NorthExtraction(collector, detailGroup, mats);

  // West Industrial District (4 OcclusionCells, including Remote Level 2 Master Control Center in Zone 10!)
  const zone3Smelter = buildFloor2Zone3WestSmelterFoundry(collector, mats);
  const zone4ForgeYard = buildFloor2Zone4SouthWestForgeYard(collector, mats);
  const zone5SlagSilo = buildFloor2Zone5FarSouthWestSlagSilo(collector, mats);
  const signalTower = buildFloor2Zone10NorthWestSignalTower(collector, mats);

  // East Rail-Yard & Cyber-Bazaar District (4 OcclusionCells)
  const zone6RailDepot = buildFloor2Zone6SouthEastRailDepot(collector, mats);
  const zone8CoolingSilo = buildFloor2Zone8FarSouthEastCoolingSilo(collector, mats);
  const zone9LocomotiveBay = buildFloor2Zone9EastLocomotiveBay(collector, mats);
  const zone11CyberBazaar = buildFloor2Zone11NorthEastCyberBazaar(collector, mats);

  const occlusionCells: OcclusionCell[] = [
    zone3Smelter,
    zone4ForgeYard,
    zone5SlagSilo,
    signalTower.cell,
    zone6RailDepot,
    zone8CoolingSilo,
    zone9LocomotiveBay,
    zone11CyberBazaar,
  ];

  // 42 Reactive Targets across ALL 12 zones & ALL 3 story levels (`14.0m, 17.1m, 20.2m`)!
  const targetsRes = buildTargetsFromSpecs(group, {
    dummies: [
      // Zone 2 Maglev Rail Canyon (L0, L1, L2)
      { id: 'f2_canyon_l0_w', x: -7.2, y: y0, z: -2.2 },
      { id: 'f2_canyon_l0_e', x: 7.2, y: y0, z: -2.2 },
      { id: 'f2_canyon_l1_n', x: 0.0, y: y1, z: -7.2 },
      { id: 'f2_canyon_l2_w', x: -7.5, y: y2, z: -2.5 },
      // Zone 3 West Smelter Foundry (L0, L1, L2)
      { id: 'f2_smelter_l0', x: -24.0, y: y0, z: -5.5 },
      { id: 'f2_smelter_l1', x: -33.5, y: y1, z: -6.8 },
      { id: 'f2_smelter_l2', x: -49.0, y: y2, z: -2.5 },
      // Zone 4 SW Hydraulic Forge Yard (L0, L1, L2)
      { id: 'f2_forge_l0', x: -20.5, y: y0, z: 18.5 },
      { id: 'f2_forge_l1', x: -25.0, y: y1, z: 31.2 },
      { id: 'f2_forge_l2', x: -23.0, y: y2, z: 9.8 },
      // Zone 5 Far SW Thermal Slag Silo (L0, L1, L2)
      { id: 'f2_slag_l0', x: -51.5, y: y0, z: 15.0 },
      { id: 'f2_slag_l1', x: -52.4, y: y1, z: 22.0 },
      { id: 'f2_slag_l2', x: -47.0, y: y2, z: 8.5 },
      // Zone 6 SE Rail Switchyard (L0, L1, L2)
      { id: 'f2_depot_l0', x: 26.5, y: y0, z: 10.5 },
      { id: 'f2_depot_l1', x: 25.0, y: y1, z: 31.2 },
      { id: 'f2_depot_l2', x: 23.0, y: y2, z: 9.8 },
      // Zone 8 Far SE Double-Helix Cooling Silo (L0, L1, L2)
      { id: 'f2_silo_l0', x: 51.5, y: y0, z: 27.5 },
      { id: 'f2_silo_l1', x: 40.0, y: y1, z: 28.5 },
      { id: 'f2_silo_l2', x: 47.0, y: y2, z: 9.2 },
      // Zone 9 East Locomotive Maintenance Bay (L0, L1, L2)
      { id: 'f2_loco_l0', x: 24.0, y: y0, z: -5.5 },
      { id: 'f2_loco_l1', x: 33.5, y: y1, z: -6.8 },
      { id: 'f2_loco_l2', x: 49.0, y: y2, z: -2.5 },
      // Zone 10 NW Signal Control Tower (L0, L1, L2 Command Dais!)
      { id: 'f2_tower_l0', x: -20.5, y: y0, z: -25.0 },
      { id: 'f2_tower_l1', x: -46.0, y: y1, z: -21.0 },
      { id: 'f2_tower_l2_guard', x: -45.5, y: y2, z: -18.5 },
      // Zone 11 NE Cyber-Cargo Bazaar (L0, L1, L2)
      { id: 'f2_bazaar_l0', x: 26.5, y: y0, z: -27.5 },
      { id: 'f2_bazaar_l1', x: 47.0, y: y1, z: -22.5 },
      { id: 'f2_bazaar_l2', x: 51.2, y: y2, z: -27.5 },
    ],
    steelPlates: [
      { id: 'f2_plate_z1_l2', x: 0.0, y: y2, z: 9.5 },
      { id: 'f2_plate_z3_l2', x: -22.5, y: y2, z: -2.5 },
      { id: 'f2_plate_z9_l2', x: 22.5, y: y2, z: -2.5 },
      { id: 'f2_plate_z10_l2', x: -49.5, y: y2, z: -29.5 },
      { id: 'f2_plate_z12_l2', x: 0.0, y: y2, z: -13.0 },
    ],
    canisters: [
      { id: 'f2_can_z4', x: -18.5, y: y0, z: 28.5 },
      { id: 'f2_can_z5', x: -50.0, y: y0, z: 27.5 },
      { id: 'f2_can_z6', x: 18.5, y: y0, z: 28.5 },
      { id: 'f2_can_z10', x: -33.0, y: y0, z: -19.0 },
      { id: 'f2_can_z11', x: 35.0, y: y0, z: -28.0 },
    ],
    drones: [
      // 4 Patrolling Industrial Security Drones across Smelter, Locomotive Bay, Signal Tower & Cyber-Bazaar!
      { id: 'f2_drone_z3', x: -34.0, y: y1 + 3.4, z: -2.5, amp: 8.5, phase: 0.0, axis: 'x' },
      { id: 'f2_drone_z9', x: 34.0, y: y1 + 3.4, z: -2.5, amp: 8.5, phase: 1.5, axis: 'x' },
      { id: 'f2_drone_z10', x: -31.0, y: y2 + 1.8, z: -22.5, amp: 6.5, phase: 0.7, axis: 'x' },
      { id: 'f2_drone_z11', x: 31.0, y: y1 + 2.4, z: -22.0, amp: 7.0, phase: 2.3, axis: 'x' },
    ],
  });

  // 12 High-Value .50 HV Heavy Ammo Crates (including 2 inside the Sealed SE Black-Market Munitions Vault!)
  const cratesRes = buildAmmoCratesFromSpecs(group, [
    { id: 'f2_crate_z1_customs', x: -7.8, y: y0, z: 13.5, rotY: 0.35 },
    { id: 'f2_crate_z2_l1', x: -9.8, y: y1, z: -3.5, rotY: 0.2 },
    { id: 'f2_crate_z3_l2', x: -52.5, y: y2, z: 1.5, rotY: 0.3 },
    { id: 'f2_crate_z4_l1', x: -30.5, y: y1, z: 31.0, rotY: -0.25 },
    { id: 'f2_crate_z5_l2', x: -52.5, y: y2, z: 8.5, rotY: 0.3 },
    // High-Reward Sealed SE Black-Market Munitions Vault Crates (reward for sniping f2_lock_blackmarket_vault!)
    { id: 'f2_crate_z6_vault_1', x: 31.4, y: y0, z: 27.2, rotY: -0.25 },
    { id: 'f2_crate_z6_vault_2', x: 31.4, y: y0, z: 31.2, rotY: 0.25 },
    { id: 'f2_crate_z8_l2', x: 52.5, y: y2, z: 8.5, rotY: -0.25 },
    { id: 'f2_crate_z9_l2', x: 52.5, y: y2, z: 1.5, rotY: -0.35 },
    // Signal Control Tower L1 & L2 Command Dais Supply Crates
    { id: 'f2_crate_z10_l1', x: -51.2, y: y1, z: -29.0, rotY: 0.3 },
    { id: 'f2_crate_z10_l2_cmd', x: -52.0, y: y2, z: -19.5, rotY: 0.4 },
    { id: 'f2_crate_z11_l2', x: 52.2, y: y2, z: -29.5, rotY: -0.3 },
  ]);

  return {
    meta: F2_META,
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
    controlCenter: signalTower.controlCenter,
    lightPreset: {
      // Distinct Cyber-Industrial Sodium-Amber vs Cool Slate-Cyan Lighting (wholly different from Floor 03 ice-temple!)
      hemiSky: 0xffe8c2,
      hemiGround: 0x161922,
      hemiIntensity: 1.15,
      keyColor: 0xffd599,
      keyIntensity: 2.42,
      keyOffset: [-14, 16, 12],
      fillColor: 0x38bdf8,
      fillIntensity: 0.92,
      fogColor: 0x14151c,
      fogDensity: 0.006,
      // 4 pooled high-contrast industrial accent lights (Maglev Canyon, West Smelter, SE Cooling Silo & NW Signal Tower!)
      pointLights: [
        { x: 0.0, yOffset: 4.8, z: -2.5, color: 0xeab308, intensity: 28, distance: 46 },
        { x: -35.0, yOffset: 5.5, z: -1.5, color: 0xf97316, intensity: 30, distance: 48 },
        { x: 45.0, yOffset: 5.5, z: 19.0, color: 0xf59e0b, intensity: 26, distance: 46 },
        { x: -38.0, yOffset: 6.2, z: -22.5, color: 0x22d3ee, intensity: 30, distance: 50 },
      ],
    },
    spawnPoint: { ...F2_SPAWN },
    bounds: { ...F2_BOUNDS },
    entryThreshold: { ...F2_ENTRY_THRESHOLD },
    dispose: () => {
      targetsRes.dispose();
      cratesRes.dispose();
    },
  };
}
