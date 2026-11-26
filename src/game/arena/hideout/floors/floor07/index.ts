import * as THREE from 'three';
import { buildAmmoCratesFromSpecs } from '../../../props/ammoCrates';
import { buildTargetsFromSpecs } from '../../../props/targets';
import type { HideoutMaterialRegistry } from '../../materials';
import type { FloorGeometryCollector } from '../../stairs';
import type { FloorBuildResult, OcclusionCell } from '../../types';
import {
  F7_BASE_Y,
  F7_BOUNDS,
  F7_ENTRY_THRESHOLD,
  F7_META,
  F7_SPAWN,
  F7_UPPER_Y,
} from './layout';
import { buildZone1ArrivalCheckpoint } from './zone1ArrivalCheckpoint';
import { buildZone2SpiralRotunda } from './zone2SpiralRotunda';
import { buildZone3WestBarracks } from './zone3WestBarracks';
import { buildZone4EastServerWing } from './zone4EastServerWing';
import { buildZone5SouthWestCargo } from './zone5SouthWestCargo';
import { buildZone6SouthEastTurbines } from './zone6SouthEastTurbines';
import { buildZone7SouthExtraction } from './zone7SouthExtraction';

/**
 * FLOOR 07 (Y = 84m) — SPIRAL WELL COMBAT NEXUS
 *
 * A massive `84m × 54m` AAA 7-zone multi-tier tactical combat world featuring:
 * 1. Zone 1 (North): Arrival Security Checkpoint (`z = -17.0` aligned cleanly with Floor 08's North Descent Gallery)
 * 2. Zone 2 (Center Hero): 13.5m Spiral Well Combat Rotunda with gaping 9.4m Central Abyss, zero-glitch sweeping
 *    Spiral Staircase, continuous annular Upper Observation Ring, Retractable Cross-Chasm Skybridge (deployable via
 *    `[E]` switch OR shooting the glowing overhead relay on the suspended Telemetry Core!), and twin Pneumatic Jump Pads!
 * 3. Zone 3 (West OcclusionCell): Tactical Barracks & Black-Ops CQB Precinct with Jammed Roll-Under Blast Shutters
 *    and a Locked Munitions Vault unlocked by sniping the crimson Relay Lock straight through the observation glass!
 * 4. Zone 4 (East OcclusionCell): Cyber-Server Atrium with grounded Server Monoliths, Pneumatic Jump Pad, Data Catwalk,
 *    and a Shootable Overhead Bypass Relay unlocking the South-East Turbine Gate!
 * 5. Zone 5 (South-West OcclusionCell): Heavy Cargo Loading Bay with corrugated containers, overhead Gantry & Jump Pad!
 * 6. Zone 6 (South-East OcclusionCell): Coolant Turbine Gallery with 3 monumental Turbine Columns & Retractable Catwalk Skybridge!
 * 7. Zone 7 (South): Extraction Concourse, Elevated South Overlook, Control Center & Massive Exit Bulkhead 07 (-> Floor 06)!
 */
export function buildFloor7Complex(mats: HideoutMaterialRegistry): FloorBuildResult {
  const baseY = F7_BASE_Y; // 84.0m
  const upperY = F7_UPPER_Y; // 88.4m

  const group = new THREE.Group();
  group.name = 'FLOOR_07_SPIRAL_WELL_COMBAT_NEXUS';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'FLOOR_07_DETAIL';
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

  // Assemble all 7 modular architectural combat zones!
  const arrivalDoor = buildZone1ArrivalCheckpoint(collector, detailGroup, mats);
  buildZone2SpiralRotunda(collector, detailGroup, mats);
  const westBarracksCell = buildZone3WestBarracks(collector, mats);
  const eastServerCell = buildZone4EastServerWing(collector, mats);
  const swCargoCell = buildZone5SouthWestCargo(collector, mats);
  const seTurbineCell = buildZone6SouthEastTurbines(collector, mats);
  const extraction = buildZone7SouthExtraction(collector, detailGroup, mats);

  const occlusionCells: OcclusionCell[] = [
    westBarracksCell,
    eastServerCell,
    swCargoCell,
    seTurbineCell,
  ];

  // Rich tactical combat targets distributed across EVERY zone & elevation tier!
  const targetsRes = buildTargetsFromSpecs(group, {
    dummies: [
      // Zone 2 Spiral Well Rotunda: Upper Ring & South Extraction defenders
      { id: 'f7_rotunda_upper_s', x: 0.0, y: upperY, z: 7.1 },
      { id: 'f7_rotunda_upper_w', x: -11.4, y: upperY, z: 0.0 },
      { id: 'f7_rotunda_upper_e', x: 11.4, y: upperY, z: 0.0 },
      { id: 'f7_rotunda_ground_sw', x: -10.8, y: baseY, z: 11.4 },
      { id: 'f7_rotunda_ground_se', x: 10.8, y: baseY, z: 11.4 },

      // Zone 3 West Tactical Barracks & Vault
      { id: 'f7_barracks_cqb_1', x: -30.5, y: baseY, z: -7.5 },
      { id: 'f7_barracks_cqb_2', x: -29.2, y: baseY, z: 5.8 },
      { id: 'f7_barracks_vault_guard', x: -37.5, y: baseY, z: -15.5 },
      { id: 'f7_barracks_catwalk', x: -19.6, y: upperY, z: 4.5 },

      // Zone 4 East Cyber-Server Atrium
      { id: 'f7_servers_aisle_1', x: 28.8, y: baseY, z: -5.8 },
      { id: 'f7_servers_aisle_2', x: 28.8, y: baseY, z: 3.2 },
      { id: 'f7_servers_balcony', x: 31.0, y: upperY, z: -16.8 },

      // Zone 5 South-West Cargo Bay
      { id: 'f7_cargo_ground_1', x: -27.2, y: baseY, z: 24.8 },
      { id: 'f7_cargo_gantry', x: -29.5, y: upperY, z: 13.5 },

      // Zone 6 South-East Coolant Turbine Gallery
      { id: 'f7_turbines_ground_1', x: 25.0, y: baseY, z: 20.5 },
      { id: 'f7_turbines_ground_2', x: 31.6, y: baseY, z: 27.6 },
      { id: 'f7_turbines_upper_e', x: 36.2, y: upperY, z: 13.2 },
    ],
    steelPlates: [
      { id: 'f7_plate_rotunda_s', x: -4.2, y: upperY, z: 13.2 },
      { id: 'f7_plate_rotunda_e', x: 4.2, y: upperY, z: 13.2 },
      { id: 'f7_plate_barracks', x: -39.4, y: baseY, z: 2.8 },
    ],
    canisters: [
      { id: 'f7_can_rotunda_w', x: -10.5, y: baseY, z: -5.8 },
      { id: 'f7_can_rotunda_e', x: 10.5, y: baseY, z: 5.8 },
      { id: 'f7_can_barracks', x: -31.8, y: baseY, z: 0.4 },
      { id: 'f7_can_servers', x: 28.8, y: baseY, z: -0.4 },
      { id: 'f7_can_cargo', x: -24.5, y: baseY, z: 16.5 },
      { id: 'f7_can_turbines', x: 28.4, y: baseY, z: 19.2 },
    ],
    drones: [
      // Orbiting / sweeping drones patrolling across the gaping Central Abyss!
      { id: 'f7_drone_abyss_low', x: 0, y: baseY + 2.8, z: 0, amp: 3.4, phase: 0, axis: 'x' },
      { id: 'f7_drone_abyss_high', x: 0, y: upperY + 2.6, z: 2.4, amp: 6.4, phase: Math.PI * 0.65, axis: 'x' },
      { id: 'f7_drone_servers', x: 29.0, y: baseY + 4.8, z: -2.0, amp: 5.5, phase: 0.9, axis: 'z' },
      { id: 'f7_drone_turbines', x: 28.5, y: baseY + 5.2, z: 20.5, amp: 6.2, phase: 2.1, axis: 'x' },
    ],
  });

  // 7 Heavy .50 HV Ammo Crates (including 2 high-reward crates inside the Shootable-Lock Munitions Vault!)
  const cratesRes = buildAmmoCratesFromSpecs(group, [
    { id: 'f7_crate_rotunda_nw', x: -11.4, y: baseY, z: -13.6, rotY: 0.4 },
    { id: 'f7_crate_rotunda_upper', x: 0.0, y: upperY, z: 13.6, rotY: 0 },
    // Inside Locked Black-Ops Munitions Vault (reward for shooting f7_lock_west_vault through the window!)
    { id: 'f7_crate_vault_1', x: -39.4, y: baseY, z: -17.6, rotY: 0.3 },
    { id: 'f7_crate_vault_2', x: -39.0, y: baseY, z: -13.0, rotY: -0.35 },
    { id: 'f7_crate_servers_balcony', x: 24.4, y: upperY, z: -18.8, rotY: 0.25 },
    { id: 'f7_crate_cargo_bay', x: -39.6, y: baseY, z: 29.4, rotY: 0.5 },
    { id: 'f7_crate_turbine_balcony', x: 35.6, y: upperY, z: 11.8, rotY: -0.4 },
  ]);

  return {
    meta: F7_META,
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
      hemiSky: 0x93d5ff,
      hemiGround: 0x1d2a3d,
      hemiIntensity: 1.02,
      keyColor: 0xe6f4ff,
      keyIntensity: 2.35,
      keyOffset: [11, 14, -9],
      fillColor: 0x22d3ee,
      fillIntensity: 0.82,
      fogColor: 0x09131f,
      fogDensity: 0.0082,
      // 4 pooled high-contrast accent lights across Rotunda Abyss, West Barracks, East Servers, and South Extraction!
      pointLights: [
        { x: 0, yOffset: 3.6, z: 0, color: 0x22d3ee, intensity: 24, distance: 34 },
        { x: -29.0, yOffset: 5.8, z: -4.0, color: 0xfb923c, intensity: 19, distance: 34 },
        { x: 29.0, yOffset: 6.2, z: -4.0, color: 0x38bdf8, intensity: 20, distance: 34 },
        { x: 0, yOffset: 6.8, z: 13.5, color: 0x67e8f9, intensity: 18, distance: 30 },
      ],
    },
    spawnPoint: { ...F7_SPAWN },
    bounds: { ...F7_BOUNDS },
    entryThreshold: { ...F7_ENTRY_THRESHOLD },
    dispose: () => {
      targetsRes.dispose();
      cratesRes.dispose();
    },
  };
}
