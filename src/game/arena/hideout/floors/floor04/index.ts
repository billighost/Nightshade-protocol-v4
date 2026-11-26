import * as THREE from 'three';
import { buildAmmoCratesFromSpecs } from '../../../props/ammoCrates';
import { buildTargetsFromSpecs } from '../../../props/targets';
import type { HideoutMaterialRegistry } from '../../materials';
import type { FloorGeometryCollector } from '../../stairs';
import type { FloorBuildResult, OcclusionCell } from '../../types';
import {
  F4_BASE_Y,
  F4_BOUNDS,
  F4_CHASM_Y,
  F4_ENTRY_THRESHOLD,
  F4_META,
  F4_MID_Y,
  F4_SPAWN,
  F4_UPPER_Y,
} from './layout';
import { buildFloor4Zone1SouthArrival } from './zone1SouthArrival';
import { buildFloor4Zone2SkybridgeChasm } from './zone2SkybridgeChasm';
import { buildFloor4Zone3WestHydroDam } from './zone3WestHydroDam';
import { buildFloor4Zone4EastTramFoundry } from './zone4EastTramFoundry';
import { buildFloor4Zone5NorthWestSubstation } from './zone5NorthWestSubstation';
import { buildFloor4Zone6NorthEastOverwatch } from './zone6NorthEastOverwatch';
import { buildFloor4Zone7SouthWestGeothermal } from './zone7SouthWestGeothermal';
import { buildFloor4Zone8SouthEastFreightYard } from './zone8SouthEastFreightYard';
import { buildFloor4Zone9NorthExtraction } from './zone9NorthExtraction';

/**
 * FLOOR 04 (Y = 42.0m) — THE SKYBRIDGE CHASM & HYDRO-GEO CANYON COMPLEX
 *
 * A monumental `96m × 64m` AAA 9-zone, 4-elevation world inspired by Halo, Call of Duty, and Control:
 * 1. Zone 1 (South): Canyon Arrival Cliff & Cable-Anchor Terrace (`z = +17.0` aligned seamlessly with Floor 05!)
 * 2. Zone 2 (Center Hero): 13.0m-tall Criss-Cross Cable-Stayed Skybridge Chasm (`39.6m` illuminated hydro-sluice chasm
 *    with 3 spinning vent turbines -> `42.0m` Armored Spine -> `44.4m` South Transverse Cable-Stayed Skybridge ->
 *    `46.4m` 27.2m Retractable North High Sniper Skybridge, West & East Suspension Towers, twin continuous switchback
 *    staircases, twin flush chasm stairs, twin calibrated Jump Pads & twin overhead counter-rotating Gyro-Turbines!)
 * 3. Zone 3 (West OcclusionCell): Hydro-Electric Dam Turbine Hall with 3 colossal kinetic rotating hydro-turbines,
 *    glowing cyan spillway channel, flush North-wall stair, calibrated Jump Pad & Jammed Roll-Under Shutter (`f4_jammed_hydro_nw`)!
 * 4. Zone 4 (East OcclusionCell): Suspended Cable-Car Tram Depot & Foundry ("NIGHTSHADE-04") with suspended 3D Gondola Tram,
 *    flush South-wall stair, 18.8m Retractable Crane Skybridge #2 (`f4_bridge_foundry_crane`) & Jammed Roll-Under Shutter (`f4_jammed_foundry_se`)!
 * 5. Zone 5 (NW OcclusionCell): High-Voltage Substation & Relay Switchyard with 4 towering transformer pylons & busbars,
 *    continuous U-shaped Upper Catwalk, calibrated North Jump Pad & Locked Bypass Security Gate (`f4_gate_nw_substation`)!
 * 6. Zone 6 (NE OcclusionCell): Canyon Overwatch Bunker & Brightly Lit Sealed Hydro-Core Armory Vault (`f4_gate_ne_vault`)
 *    unlocked by sniping the glowing crimson Relay Lock (`f4_lock_ne_vault`) straight through the panoramic armored glass!
 * 7. Zone 7 (SW OcclusionCell): Geothermal Pump & Pressure Manifold Cavern with 3 colossal kinetic geothermal turbines,
 *    flush West-wall stair & Upper Geothermal Overlook Gallery!
 * 8. Zone 8 (SE OcclusionCell): Canyon Logistics Freight Yard with staggered corrugated shipping containers,
 *    flush East-wall stair & 3rd Retractable Freight Gantry Skybridge (`f4_bridge_se_freight`)!
 * 9. Zone 9 (North): Canyon Dispatch Concourse, Elevated Overlook Bridge, Control Center & Massive Exit Bulkhead 04!
 */
export function buildFloor4Complex(mats: HideoutMaterialRegistry): FloorBuildResult {
  const chasmY = F4_CHASM_Y; // 39.6m
  const baseY = F4_BASE_Y; // 42.0m
  const midY = F4_MID_Y; // 44.4m
  const upperY = F4_UPPER_Y; // 46.4m

  const group = new THREE.Group();
  group.name = 'FLOOR_04_SKYBRIDGE_CHASM_COMPLEX';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'FLOOR_04_DETAIL';
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

  // Assemble all 9 modular architectural combat zones!
  const arrivalDoor = buildFloor4Zone1SouthArrival(collector, detailGroup, mats);
  buildFloor4Zone2SkybridgeChasm(collector, detailGroup, mats);
  const westHydroDamCell = buildFloor4Zone3WestHydroDam(collector, mats);
  const eastTramFoundryCell = buildFloor4Zone4EastTramFoundry(collector, mats);
  const nwSubstationCell = buildFloor4Zone5NorthWestSubstation(collector, mats);
  const neOverwatchCell = buildFloor4Zone6NorthEastOverwatch(collector, mats);
  const swGeothermalCell = buildFloor4Zone7SouthWestGeothermal(collector, mats);
  const seFreightYardCell = buildFloor4Zone8SouthEastFreightYard(collector, mats);
  const extraction = buildFloor4Zone9NorthExtraction(collector, detailGroup, mats);

  const occlusionCells: OcclusionCell[] = [
    westHydroDamCell,
    eastTramFoundryCell,
    nwSubstationCell,
    neOverwatchCell,
    swGeothermalCell,
    seFreightYardCell,
  ];

  // 36 Reactive Targets across ALL 9 zones & ALL 4 elevation tiers (`39.6m, 42.0m, 44.4m, 46.4m`)!
  const targetsRes = buildTargetsFromSpecs(group, {
    dummies: [
      // Zone 2 Criss-Cross Skybridge Chasm (Chasm Floor, Spine, Mid Transverse Bridge & Upper Towers)
      { id: 'f4_chasm_abyss_w', x: -6.2, y: chasmY, z: -4.8 },
      { id: 'f4_chasm_abyss_e', x: 6.2, y: chasmY, z: 4.8 },
      { id: 'f4_chasm_spine_c', x: 0.0, y: baseY, z: -4.2 },
      { id: 'f4_chasm_mid_w', x: -6.2, y: midY, z: 4.6 },
      { id: 'f4_chasm_mid_e', x: 6.2, y: midY, z: 4.6 },
      { id: 'f4_chasm_tower_w', x: -15.6, y: upperY, z: 1.4 },
      { id: 'f4_chasm_tower_e', x: 15.6, y: upperY, z: -1.4 },
      // Zone 3 West Hydro-Electric Dam
      { id: 'f4_hydro_floor_w', x: -34.0, y: baseY, z: -1.8 },
      { id: 'f4_hydro_floor_e', x: -24.0, y: baseY, z: -2.2 },
      { id: 'f4_hydro_bridge', x: -33.0, y: upperY, z: -4.2 },
      // Zone 4 East Tram Depot Foundry
      { id: 'f4_foundry_floor_n', x: 33.0, y: baseY, z: -4.4 },
      { id: 'f4_foundry_floor_s', x: 26.2, y: baseY, z: 5.2 },
      { id: 'f4_foundry_mezz_e', x: 45.0, y: upperY, z: -1.6 },
      // Zone 5 NW High-Voltage Substation
      { id: 'f4_nw_sub_floor', x: -33.0, y: baseY, z: -21.8 },
      { id: 'f4_nw_sub_catwalk', x: -45.0, y: upperY, z: -24.2 },
      // Zone 6 NE Canyon Overwatch Bunker
      { id: 'f4_ne_overwatch_floor', x: 25.4, y: baseY, z: -26.2 },
      { id: 'f4_ne_overwatch_skywalk', x: 33.4, y: upperY, z: -21.2 },
      // Zone 7 SW Geothermal Manifold
      { id: 'f4_sw_geo_floor', x: -31.0, y: baseY, z: 16.2 },
      { id: 'f4_sw_geo_catwalk', x: -30.0, y: upperY, z: 13.0 },
      // Zone 8 SE Logistics Freight Yard
      { id: 'f4_se_freight_lane', x: 32.2, y: baseY, z: 21.8 },
      { id: 'f4_se_freight_balcony', x: 45.0, y: upperY, z: 16.4 },
    ],
    steelPlates: [
      { id: 'f4_plate_chasm_n', x: 0.0, y: upperY, z: -13.0 },
      { id: 'f4_plate_chasm_s', x: 0.0, y: upperY, z: 13.0 },
      { id: 'f4_plate_hydro_w', x: -44.6, y: baseY, z: 0.0 },
      { id: 'f4_plate_foundry_e', x: 44.6, y: baseY, z: 0.0 },
      { id: 'f4_plate_freight_s', x: 22.4, y: baseY, z: 23.6 },
    ],
    canisters: [
      { id: 'f4_can_abyss_n', x: -4.2, y: chasmY, z: -7.2 },
      { id: 'f4_can_abyss_s', x: 4.2, y: chasmY, z: 7.2 },
      { id: 'f4_can_nw_sub', x: -26.4, y: baseY, z: -14.2 },
      { id: 'f4_can_sw_geo', x: -34.5, y: baseY, z: 28.4 },
      { id: 'f4_can_se_freight', x: 39.8, y: baseY, z: 28.2 },
    ],
    drones: [
      // 5 Dynamic Patrolling Drones across Canyon Chasm, Hydro Dam, Tram Foundry, Substation & Freight Yard!
      { id: 'f4_drone_canyon_low', x: 0.0, y: baseY + 2.8, z: -2.2, amp: 6.2, phase: 0.0, axis: 'x' },
      { id: 'f4_drone_canyon_high', x: 0.0, y: upperY + 2.6, z: 3.4, amp: 7.8, phase: 1.4, axis: 'x' },
      { id: 'f4_drone_hydro', x: -31.0, y: baseY + 6.4, z: 1.2, amp: 6.0, phase: 0.8, axis: 'x' },
      { id: 'f4_drone_foundry', x: 33.0, y: baseY + 6.8, z: -4.2, amp: 5.4, phase: 2.1, axis: 'x' },
      { id: 'f4_drone_substation', x: -33.0, y: baseY + 6.6, z: -18.6, amp: 5.0, phase: 2.8, axis: 'x' },
    ],
  });

  // 10 High-Value .50 HV Heavy Ammo Crates (including 2 inside the Sealed NE Hydro-Core Armory Vault!)
  const cratesRes = buildAmmoCratesFromSpecs(group, [
    { id: 'f4_crate_arrival_e', x: 14.8, y: baseY, z: 14.8, rotY: -0.35 },
    { id: 'f4_crate_chasm_w', x: -8.6, y: chasmY, z: 4.2, rotY: 0.35 },
    { id: 'f4_crate_overlook_n', x: 5.6, y: upperY, z: -13.0, rotY: -0.2 },
    { id: 'f4_crate_hydro_catwalk', x: -45.0, y: upperY, z: 5.2, rotY: 0.3 },
    { id: 'f4_crate_foundry_mezz', x: 45.2, y: upperY, z: -6.8, rotY: -0.35 },
    { id: 'f4_crate_nw_substation', x: -45.0, y: upperY, z: -29.2, rotY: 0.4 },
    // High-Reward Hydro-Core Armory Vault Crates (reward for sniping f4_lock_ne_vault through panoramic glass!)
    { id: 'f4_crate_ne_vault_1', x: 43.2, y: baseY + 0.18, z: -23.0, rotY: 0.3 },
    { id: 'f4_crate_ne_vault_2', x: 43.2, y: baseY + 0.18, z: -26.8, rotY: -0.25 },
    { id: 'f4_crate_sw_geothermal', x: -45.0, y: upperY, z: 13.0, rotY: 0.25 },
    { id: 'f4_crate_se_freight', x: 45.0, y: upperY, z: 18.8, rotY: -0.35 },
  ]);

  return {
    meta: F4_META,
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
      hemiSky: 0xffe8d6,
      hemiGround: 0x1a2634,
      hemiIntensity: 1.12,
      keyColor: 0xfff5eb,
      keyIntensity: 2.42,
      keyOffset: [10, 15, -10],
      fillColor: 0x38bdf8,
      fillIntensity: 0.94,
      fogColor: 0x11151d,
      fogDensity: 0.0068,
      // 4 pooled high-contrast accent lights across Canyon Chasm, Hydro Dam, Gondola Foundry & NE/SW Wings!
      pointLights: [
        { x: 0, yOffset: 5.4, z: 0, color: 0xf97316, intensity: 28, distance: 44 },
        { x: -33.0, yOffset: 6.2, z: 0.0, color: 0x06b6d4, intensity: 24, distance: 42 },
        { x: 33.0, yOffset: 6.4, z: 1.6, color: 0xf59e0b, intensity: 24, distance: 42 },
        { x: 42.5, yOffset: 3.4, z: -25.0, color: 0x22d3ee, intensity: 22, distance: 38 },
      ],
    },
    spawnPoint: { ...F4_SPAWN },
    bounds: { ...F4_BOUNDS },
    entryThreshold: { ...F4_ENTRY_THRESHOLD },
    dispose: () => {
      targetsRes.dispose();
      cratesRes.dispose();
    },
  };
}
