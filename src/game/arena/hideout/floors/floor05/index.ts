import * as THREE from 'three';
import { buildAmmoCratesFromSpecs } from '../../../props/ammoCrates';
import { buildTargetsFromSpecs } from '../../../props/targets';
import type { HideoutMaterialRegistry } from '../../materials';
import type { FloorGeometryCollector } from '../../stairs';
import type { FloorBuildResult, OcclusionCell } from '../../types';
import {
  F5_BASE_Y,
  F5_BOUNDS,
  F5_ENTRY_THRESHOLD,
  F5_META,
  F5_PIT_Y,
  F5_SPAWN,
  F5_TIER_Y,
  F5_UPPER_Y,
} from './layout';
import { buildFloor5Zone1NorthArrival } from './zone1NorthArrival';
import { buildFloor5Zone2ColiseumAmphitheater } from './zone2ColiseumAmphitheater';
import { buildFloor5Zone3WestSimDeck } from './zone3WestSimDeck';
import { buildFloor5Zone4EastMechBay } from './zone4EastMechBay';
import { buildFloor5Zone5NorthWestOrbital } from './zone5NorthWestOrbital';
import { buildFloor5Zone6NorthEastCommand } from './zone6NorthEastCommand';
import { buildFloor5Zone7SouthWestReactor } from './zone7SouthWestReactor';
import { buildFloor5Zone8SouthEastOrdnance } from './zone8SouthEastOrdnance';
import { buildFloor5Zone9SouthExtraction } from './zone9SouthExtraction';

/**
 * FLOOR 05 (Y = 56.0m) — TACTICAL WAR-GAMES AMPHITHEATER & ORBITAL COMMAND COMPLEX
 *
 * A monumental `96m × 64m` AAA 9-zone, 4-elevation world inspired by Call of Duty, Halo, and Control:
 * 1. Zone 1 (North): Tactical Arrival Checkpoint (`z = -17.0` aligned seamlessly with Floor 06's North Descent Gallery!)
 * 2. Zone 2 (Center Hero): 13.4m-tall Concentric War-Games Amphitheater Coliseum (`56.0m` promenade -> `54.7m` terrace ->
 *    `53.4m` sunken war-pit) with 4 cardinal stairs, spinning Dual Holographic Orbital Globe, 4 Jumbo Screens,
 *    West & East `+4.4m` VIP Balconies (`60.4m`), Twin VIP Staircases, Twin Pneumatic Jump Pads & 27.2m Retractable Skybridge!
 * 3. Zone 3 (West OcclusionCell): Tactical Sim-Deck Kill-Grid with multi-lane ballistic CQB partitions, Overwatch Catwalk,
 *    flush West wall stair, calibrated Jump Pad & Jammed Roll-Under Blast Shutter (`f5_jammed_sim_nw`)!
 * 4. Zone 4 (East OcclusionCell): Armored Mech-Bay & Dropship Hangar ("VANGUARD-05") with flush East wall stair,
 *    18.8m Retractable Mech Gantry Skybridge & Jammed Roll-Under Blast Shutter (`f5_jammed_mech_se`)!
 * 5. Zone 5 (NW OcclusionCell): Orbital Telemetry & Satellite Dish Array with colossal kinetic Rotating Dish,
 *    continuous U-shaped Upper Catwalk, North Jump Pad & Locked Orbital Bypass Security Gate (`f5_gate_nw_bypass`)!
 * 6. Zone 6 (NE OcclusionCell): War-Council Briefing Bunker & Brightly Lit Sealed Black-Ops Prototype Vault
 *    (`f5_gate_ne_vault`) unlocked by sniping the glowing crimson Relay Lock straight through the panoramic glass!
 * 7. Zone 7 (SW OcclusionCell): Thermal Conduit & Turbine Reactor Gallery with 3 Counter-Rotating Thermal Turbines,
 *    flush West wall stair & Upper Turbine Overlook Gallery!
 * 8. Zone 8 (SE OcclusionCell): Heavy Military Ordnance Depot with staggered corrugated shipping containers,
 *    flush East wall stair & 3rd Retractable Logistics Skybridge (`f5_bridge_se_depot`)!
 * 9. Zone 9 (South): Director's Extraction Concourse, Elevated Overlook Bridge, Control Center & Massive Exit Bulkhead 05!
 */
export function buildFloor5Complex(mats: HideoutMaterialRegistry): FloorBuildResult {
  const baseY = F5_BASE_Y; // 56.0m
  const tierY = F5_TIER_Y; // 54.7m
  const pitY = F5_PIT_Y; // 53.4m
  const upperY = F5_UPPER_Y; // 60.4m

  const group = new THREE.Group();
  group.name = 'FLOOR_05_TACTICAL_WARGAMES_COMPLEX';
  const detailGroup = new THREE.Group();
  detailGroup.name = 'FLOOR_05_DETAIL';
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
  const arrivalDoor = buildFloor5Zone1NorthArrival(collector, detailGroup, mats);
  buildFloor5Zone2ColiseumAmphitheater(collector, detailGroup, mats);
  const westSimDeckCell = buildFloor5Zone3WestSimDeck(collector, mats);
  const eastMechBayCell = buildFloor5Zone4EastMechBay(collector, mats);
  const nwOrbitalCell = buildFloor5Zone5NorthWestOrbital(collector, mats);
  const neCommandCell = buildFloor5Zone6NorthEastCommand(collector, mats);
  const swReactorCell = buildFloor5Zone7SouthWestReactor(collector, mats);
  const seOrdnanceCell = buildFloor5Zone8SouthEastOrdnance(collector, mats);
  const extraction = buildFloor5Zone9SouthExtraction(collector, detailGroup, mats);

  const occlusionCells: OcclusionCell[] = [
    westSimDeckCell,
    eastMechBayCell,
    nwOrbitalCell,
    neCommandCell,
    swReactorCell,
    seOrdnanceCell,
  ];

  // 35 Reactive Targets distributed across ALL 9 zones & ALL 4 elevation tiers (`53.4m, 54.7m, 56.0m, 60.4m`)!
  const targetsRes = buildTargetsFromSpecs(group, {
    dummies: [
      // Zone 2 Coliseum Amphitheater (Pit, Mid Terrace & Upper VIP Balconies)
      { id: 'f5_coliseum_pit_w', x: -4.2, y: pitY, z: 0.0 },
      { id: 'f5_coliseum_pit_e', x: 4.2, y: pitY, z: 0.0 },
      { id: 'f5_coliseum_terrace_s', x: 4.8, y: tierY, z: 8.8 },
      { id: 'f5_coliseum_vip_w', x: -15.6, y: upperY, z: -2.4 },
      { id: 'f5_coliseum_vip_e', x: 15.6, y: upperY, z: 3.4 },
      { id: 'f5_coliseum_overlook_s', x: -5.6, y: upperY, z: 12.6 },
      // Zone 3 West Sim-Deck Kill-Grid
      { id: 'f5_sim_lane_n', x: -30.0, y: baseY, z: -3.2 },
      { id: 'f5_sim_lane_s', x: -30.0, y: baseY, z: 3.2 },
      { id: 'f5_sim_overwatch', x: -24.0, y: upperY, z: -4.2 },
      // Zone 4 East Mech-Bay & Dropship Hangar
      { id: 'f5_mech_bay_n', x: 34.4, y: baseY, z: -5.2 },
      { id: 'f5_mech_bay_s', x: 28.0, y: baseY, z: 6.4 },
      { id: 'f5_mech_spine_e', x: 43.6, y: upperY, z: 1.8 },
      // Zone 5 NW Orbital Telemetry Array
      { id: 'f5_nw_orbital_ground', x: -25.4, y: baseY, z: -21.0 },
      { id: 'f5_nw_orbital_catwalk', x: -44.6, y: upperY, z: -20.0 },
      // Zone 6 NE War-Council Bunker & Vault
      { id: 'f5_ne_command_floor', x: 23.6, y: baseY, z: -25.0 },
      { id: 'f5_ne_command_gallery', x: 24.4, y: upperY, z: -12.8 },
      // Zone 7 SW Thermal Turbine Gallery
      { id: 'f5_sw_reactor_ground', x: -30.5, y: baseY, z: 17.6 },
      { id: 'f5_sw_reactor_overlook', x: -24.0, y: upperY, z: 13.0 },
      // Zone 8 SE Heavy Ordnance Depot
      { id: 'f5_se_ordnance_lane', x: 33.0, y: baseY, z: 26.8 },
      { id: 'f5_se_ordnance_balcony', x: 20.8, y: upperY, z: 14.8 },
    ],
    steelPlates: [
      { id: 'f5_plate_coliseum_sw', x: -8.8, y: tierY, z: 5.4 },
      { id: 'f5_plate_coliseum_se', x: 8.8, y: tierY, z: 5.4 },
      { id: 'f5_plate_sim_w', x: -37.2, y: baseY, z: 0.0 },
      { id: 'f5_plate_mech_w', x: 21.8, y: baseY, z: -1.4 },
      { id: 'f5_plate_se_depot', x: 39.8, y: baseY, z: 14.2 },
    ],
    canisters: [
      { id: 'f5_can_pit_n', x: 0.0, y: pitY, z: -4.8 },
      { id: 'f5_can_pit_s', x: 0.0, y: pitY, z: 4.8 },
      { id: 'f5_can_sim_c', x: -22.2, y: baseY, z: 0.0 },
      { id: 'f5_can_nw_dish', x: -39.6, y: baseY, z: -13.6 },
      { id: 'f5_can_sw_turb', x: -33.5, y: baseY, z: 29.0 },
    ],
    drones: [
      // 5 Dynamic Patrolling Tactical Drones across Coliseum, Sim-Deck, Mech-Bay, NW Orbital & SW Reactor!
      { id: 'f5_drone_coliseum_low', x: 0.0, y: baseY + 2.4, z: 3.4, amp: 5.2, phase: 0.0, axis: 'x' },
      { id: 'f5_drone_coliseum_high', x: 0.0, y: upperY + 2.6, z: -3.8, amp: 7.4, phase: 1.5, axis: 'x' },
      { id: 'f5_drone_simdeck', x: -30.0, y: baseY + 5.8, z: 3.6, amp: 5.8, phase: 0.9, axis: 'x' },
      { id: 'f5_drone_mechbay', x: 33.0, y: baseY + 6.4, z: 1.8, amp: 5.4, phase: 2.1, axis: 'z' },
      { id: 'f5_drone_orbital', x: -33.0, y: baseY + 7.2, z: -18.2, amp: 5.2, phase: 2.9, axis: 'x' },
    ],
  });

  // 10 High-Value .50 HV Heavy Ammo Crates (including 2 inside the Sealed NE Black-Ops Prototype Vault!)
  const cratesRes = buildAmmoCratesFromSpecs(group, [
    { id: 'f5_crate_arrival_w', x: -14.8, y: baseY, z: -14.8, rotY: 0.35 },
    { id: 'f5_crate_pit_s', x: 2.8, y: pitY, z: 2.8, rotY: -0.45 },
    { id: 'f5_crate_coliseum_overlook', x: 5.8, y: upperY, z: 12.8, rotY: 0.2 },
    { id: 'f5_crate_simdeck_mid', x: -29.8, y: baseY, z: -8.2, rotY: 0.0 },
    { id: 'f5_crate_mechbay_spine', x: 45.6, y: upperY, z: -7.2, rotY: -0.35 },
    { id: 'f5_crate_nw_orbital_deck', x: -45.0, y: upperY, z: -29.2, rotY: 0.4 },
    // High-Reward Black-Ops Prototype Vault Crates (reward for sniping f5_lock_ne_vault through observation glass!)
    { id: 'f5_crate_ne_vault_1', x: 43.2, y: baseY + 0.18, z: -22.8, rotY: 0.3 },
    { id: 'f5_crate_ne_vault_2', x: 43.2, y: baseY + 0.18, z: -25.6, rotY: -0.25 },
    { id: 'f5_crate_sw_reactor_overlook', x: -44.6, y: upperY, z: 13.6, rotY: 0.25 },
    { id: 'f5_crate_se_ordnance_balcony', x: 45.4, y: upperY, z: 12.6, rotY: -0.35 },
  ]);

  return {
    meta: F5_META,
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
      hemiSky: 0xdbeafe,
      hemiGround: 0x261d29,
      hemiIntensity: 1.08,
      keyColor: 0xfff1f2,
      keyIntensity: 2.38,
      keyOffset: [-10, 15, 10],
      fillColor: 0x38bdf8,
      fillIntensity: 0.88,
      fogColor: 0x100c14,
      fogDensity: 0.0072,
      // 4 pooled high-contrast accent lights across Coliseum Holo-Globe, Sim-Deck, Dropship Mech-Bay & NE/SW Wings!
      pointLights: [
        { x: 0, yOffset: 4.8, z: 0, color: 0xfb7185, intensity: 26, distance: 40 },
        { x: -33.0, yOffset: 6.2, z: 0.0, color: 0x10b981, intensity: 22, distance: 40 },
        { x: 33.0, yOffset: 6.4, z: 1.8, color: 0xf59e0b, intensity: 23, distance: 40 },
        { x: -31.0, yOffset: 6.4, z: 22.0, color: 0xf97316, intensity: 22, distance: 40 },
      ],
    },
    spawnPoint: { ...F5_SPAWN },
    bounds: { ...F5_BOUNDS },
    entryThreshold: { ...F5_ENTRY_THRESHOLD },
    dispose: () => {
      targetsRes.dispose();
      cratesRes.dispose();
    },
  };
}
