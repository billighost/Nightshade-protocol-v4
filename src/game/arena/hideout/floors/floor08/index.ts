import * as THREE from 'three';
import { buildAmmoCratesFromSpecs } from '../../../props/ammoCrates';
import { buildTargetsFromSpecs } from '../../../props/targets';
import type { HideoutMaterialRegistry } from '../../materials';
import type { FloorGeometryCollector } from '../../stairs';
import { FLOOR_CATALOG, type FloorBuildResult, type OcclusionCell } from '../../types';
import { F8_BASE_Y, F8_BOUNDS, F8_MEZZ_Y, F8_SPAWN } from './layout';
import { buildFloor8Zone1OpsBriefing } from './zone1OpsBriefing';
import { buildFloor8Zone2ArmoryWing } from './zone2ArmoryWing';
import { buildFloor8Zone3KillhouseWing } from './zone3KillhouseWing';
import { buildFloor8Zone4MainFiringHall } from './zone4MainFiringHall';
import { buildFloor8Zone5NorthAtrium } from './zone5NorthAtrium';

/**
 * FLOOR 08 (Y = 98m) — APEX TACTICAL PROVING COMPLEX
 *
 * A complete, self-contained AAA multi-wing facility world spanning 5 interconnected zones:
 * 1. Zone 1 (South): Ops Briefing Rotunda & Deployment Concourse (Spawn + Title Backdrop + 11m Blast Archway)
 * 2. Zone 2 (East OcclusionCell): Tactical Armory, Ballistics Glass Observation Corridor & Express Lift Vault (→ FL 01)
 * 3. Zone 3 (West OcclusionCell): Multi-Room CQB Breaching Killhouse ("Shoot House 08") + Overhead Instructor Catwalk
 * 4. Zone 4 (Center Hero): Monumental 13.5m Ballistic Proving Cathedral (5 Shooting Booths, Acoustic Baffles, Mezzanine, Twin Grand Stairs)
 * 5. Zone 5 (North OcclusionCell): Vertical Security Atrium, Upper Command Bridge + Twin Stairs, Control Center & Massive Bulkhead 08
 */
export function buildFloor8Complex(mats: HideoutMaterialRegistry): FloorBuildResult {
  const meta = FLOOR_CATALOG[8];
  const baseY = F8_BASE_Y; // 98.0m
  const mezzY = F8_MEZZ_Y; // 102.4m
  const accentMat = mats.floorAccent[8];

  const group = new THREE.Group();
  group.name = 'FLOOR_08_APEX_TACTICAL_PROVING_COMPLEX';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'FLOOR_08_DETAIL';
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
    explosiveBarrels: [],
    animatedSpinners: [],
  };

  // Assemble all 5 modular architectural zones cleanly!
  buildFloor8Zone1OpsBriefing(collector, mats, detailGroup, accentMat);
  buildFloor8Zone4MainFiringHall(collector, mats, detailGroup, accentMat);
  const armoryCell = buildFloor8Zone2ArmoryWing(collector, mats, accentMat);
  const killhouseCell = buildFloor8Zone3KillhouseWing(collector, mats, accentMat);
  const atriumRes = buildFloor8Zone5NorthAtrium(collector, mats, accentMat);

  const occlusionCells: OcclusionCell[] = [
    armoryCell,
    killhouseCell,
    atriumRes.occlusionCell,
  ];

  // Reactive Ballistic Targets, High-Altitude Drones & Canisters across BOTH Main Range AND West CQB Killhouse!
  const targetsRes = buildTargetsFromSpecs(group, {
    dummies: [
      // Zone 4 Main Ballistic Hall: Near 10m & Mid 18m reactive lanes
      { id: 'f8_range_near_l', x: -5.4, y: baseY, z: 17.6 },
      { id: 'f8_range_near_c', x: 0.0, y: baseY, z: 17.6 },
      { id: 'f8_range_near_r', x: 5.4, y: baseY, z: 17.6 },
      { id: 'f8_range_mid_l', x: -7.2, y: baseY, z: 9.2 },
      { id: 'f8_range_mid_r', x: 7.2, y: baseY, z: 9.2 },
      // Zone 4 Elevated Mezzanine sniper lane targets (+4.4m!)
      { id: 'f8_range_mezz_l', x: -14.6, y: mezzY, z: 7.6 },
      { id: 'f8_range_mezz_r', x: 14.6, y: mezzY, z: 7.6 },
      // Zone 3 CQB Breaching Killhouse ("Shoot House 08") blind-corner pop-up targets!
      { id: 'f8_kh_alpha_w', x: -29.2, y: baseY, z: 29.2 },
      { id: 'f8_kh_alpha_e', x: -19.2, y: baseY, z: 29.0 },
      { id: 'f8_kh_center', x: -26.8, y: baseY, z: 11.4 },
      { id: 'f8_kh_east_room', x: -19.6, y: baseY, z: 9.8 },
      { id: 'f8_kh_flank_n', x: -33.2, y: baseY, z: 7.5 },
    ],
    steelPlates: [
      // Zone 4 Far-Range Armored Steel Gongs directly in front of the Bullet-Trap Backstop
      { id: 'f8_plate_0', x: -4.2, y: baseY, z: 2.8 },
      { id: 'f8_plate_1', x: 0.0, y: baseY, z: 2.8 },
      { id: 'f8_plate_2', x: 4.2, y: baseY, z: 2.8 },
    ],
    canisters: [
      // Zone 4 Range explosive canisters
      { id: 'f8_can_range_l', x: -3.4, y: baseY, z: 12.6 },
      { id: 'f8_can_range_r', x: 3.4, y: baseY, z: 12.6 },
      { id: 'f8_can_range_far', x: 0.0, y: baseY, z: 6.4 },
      // Zone 3 Killhouse breach canister
      { id: 'f8_can_kh_center', x: -25.8, y: baseY, z: 17.6 },
    ],
    drones: [
      // Zone 4 High-altitude cathedral patrol drones
      { id: 'f8_drone_mid', x: 0, y: baseY + 3.4, z: 14.2, amp: 7.2, phase: 0, axis: 'x' },
      { id: 'f8_drone_high', x: 0, y: baseY + 7.2, z: 6.2, amp: 9.2, phase: Math.PI * 0.7, axis: 'x' },
      // Zone 3 Killhouse aerial target drone patrolling above CQB bunker
      { id: 'f8_drone_kh', x: -26.5, y: baseY + 3.1, z: 18.0, amp: 4.2, phase: 1.4, axis: 'x' },
    ],
  });

  // Interactive .50 HV Heavy Ammo Crates distributed thoughtfully across all major wings!
  const cratesRes = buildAmmoCratesFromSpecs(group, [
    { id: 'f8_crate_range_sw', x: -10.4, y: baseY, z: 29.8, rotY: 0.3 },
    { id: 'f8_crate_mezz_s', x: 0.0, y: mezzY, z: 30.8, rotY: 0 },
    { id: 'f8_crate_armory', x: 20.4, y: baseY, z: 39.6, rotY: -0.4 },
    { id: 'f8_crate_ordnance_vault', x: 32.0, y: baseY, z: 38.6, rotY: -0.25 },
    { id: 'f8_crate_killhouse', x: -21.2, y: baseY, z: 39.8, rotY: 0.4 },
    { id: 'f8_crate_atrium', x: -8.6, y: baseY, z: -11.6, rotY: 0.2 },
  ]);

  return {
    meta,
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
    exitDoor: atriumRes.exitDoor,
    tacticalDoors: collector.tacticalDoors,
    explosiveBarrels: collector.explosiveBarrels,
    animatedSpinners: collector.animatedSpinners,
    controlCenter: atriumRes.controlCenter,
    lightPreset: {
      hemiSky: 0xbad9f8,
      hemiGround: 0x243041,
      hemiIntensity: 1.05,
      keyColor: 0xeaf4ff,
      keyIntensity: 2.35,
      keyOffset: [10, 14, 10],
      fillColor: 0x38bdf8,
      fillIntensity: 0.78,
      fogColor: 0x0b121c,
      fogDensity: 0.0085,
      // 4 pooled high-contrast zone accent lights across Briefing, Main Hall, Killhouse/Armory, and North Atrium!
      pointLights: [
        { x: 0, yOffset: 5.5, z: 43.0, color: 0x38bdf8, intensity: 16, distance: 26 },
        { x: 0, yOffset: 9.5, z: 14.0, color: 0xbae6fd, intensity: 22, distance: 38 },
        { x: -26.0, yOffset: 6.5, z: 18.0, color: 0xfb923c, intensity: 18, distance: 30 },
        { x: 0, yOffset: 8.5, z: -10.5, color: 0x22d3ee, intensity: 18, distance: 32 },
      ],
    },
    spawnPoint: { ...F8_SPAWN },
    bounds: { ...F8_BOUNDS },
    entryThreshold: { minX: -26, maxX: 26, minZ: -17, maxZ: 52, maxY: baseY + 14 },
    dispose: () => {
      targetsRes.dispose();
      cratesRes.dispose();
    },
  };
}
