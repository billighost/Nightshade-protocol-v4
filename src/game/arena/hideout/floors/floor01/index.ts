import * as THREE from 'three';
import { buildAmmoCratesFromSpecs } from '../../../props/ammoCrates';
import { buildTargetsFromSpecs } from '../../../props/targets';
import type { HideoutMaterialRegistry } from '../../materials';
import type { FloorGeometryCollector } from '../../stairs';
import type { FloorBuildResult } from '../../types';
import { buildExplosiveBarrel } from '../../mechanics';
import { buildFloor1ShellAndCenterpiece } from './colosseumShellAndCenterpiece';
import {
  F1_GRID,
  F1_L0_Y,
  F1_L1_Y,
  F1_L2_Y,
  F1_L3_Y,
  F1_META,
  F1_MIN_SAFE_Y,
  F1_SPAWN,
} from './layout';
import { buildFloor1TieredGalleriesAndTowers } from './tieredGalleriesAndTowers';
import { buildFloor1VaultsAndSanctum } from './vaultsAndSanctum';
import { buildFloor1VestibuleAndOverlook } from './vestibuleAndOverlook';

/**
 * FLOOR 01 — THE ECLIPSE SOVEREIGN COLOSSEUM (FINAL BOSS ARENA)
 *
 * Colossal 88m × 88m × 24.6m single unified non-cyber obsidian, weathered bone-stone, sovereign gold,
 * and blood-eclipse crimson cathedral-colosseum with:
 * - Dramatic Arrival Omen Vestibule & cantilevered Sovereign Viewing Overlook (`Y = 0.0m`, 12m above Boss Pit)
 * - Hovering Black-Sun Eclipse Singularity & counter-rotating gyroscopic celestial rings
 * - Central stepped Boss Throne Dais, 8 monumental 24.5m cover pillars & 8 solid 3.2m blast-shield cover walls
 * - 4 playable vertical tiers (`-12.0m`, `-6.0m`, `0.0m`, `+5.2m`), Twin Stacked Curved Spiral Ascent Towers,
 *   2 Retractable Aerial Siege Skybridges, 6 calibrated Gravity-Vortex Jump Pads, and Twin Sealed Armory Vaults
 * - South L2 Sovereign Control Center unsealing the colossal 6.8m × 6.5m Final Core Vault 01 & Inner Sanctum
 */
export function buildFloor1Complex(mats: HideoutMaterialRegistry): FloorBuildResult {
  const group = new THREE.Group();
  group.name = 'FLOOR_01_ECLIPSE_SOVEREIGN_COLOSSEUM';

  const detailGroup = new THREE.Group();
  detailGroup.name = 'FLOOR_01_DETAIL';
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

  // 1. Arrival Omen Vestibule & Cantilevered Sovereign Viewing Overlook (`L2 = 0.0m`)
  const arrivalDoor = buildFloor1VestibuleAndOverlook(collector, detailGroup, mats);

  // 2. Colossal 88m × 88m × 24.6m Colosseum Shell, Black-Sun Singularity, Boss Dais, Pillars & Cover Walls
  buildFloor1ShellAndCenterpiece(collector, detailGroup, mats);

  // 3. 4-Tier Galleries, Twin Curved Spiral Towers, Aerial Siege Skybridges & 6 Calibrated Jump Pads
  buildFloor1TieredGalleriesAndTowers(collector, detailGroup, mats);

  // 4. Twin Watertight L0 Armory Vaults, South L2 Sovereign Control Center & Final Core Vault 01 + Inner Sanctum
  const { exitDoor, controlCenter, occlusionCells } = buildFloor1VaultsAndSanctum(
    collector,
    detailGroup,
    mats
  );

  // 5. 10 Explosive Pressurized Plasma Barrels placed around cover lanes & boss flanks (strictly clear of Jump Pads!)
  const barrelCoords: Array<[string, number, number, number]> = [
    ['f1_barrel_nw_cover', -15.2, F1_L0_Y, 21.5],
    ['f1_barrel_ne_cover', 15.2, F1_L0_Y, 21.5],
    ['f1_barrel_sw_cover', -15.2, F1_L0_Y, 58.5],
    ['f1_barrel_se_cover', 15.2, F1_L0_Y, 58.5],
    ['f1_barrel_n_flank_w', -6.2, F1_L0_Y, 12.8],
    ['f1_barrel_n_flank_e', 6.2, F1_L0_Y, 12.8],
    ['f1_barrel_s_flank_w', -6.2, F1_L0_Y, 67.2],
    ['f1_barrel_s_flank_e', 6.2, F1_L0_Y, 67.2],
    ['f1_barrel_l1_w', -38.8, F1_L1_Y, 32.0],
    ['f1_barrel_l1_e', 38.8, F1_L1_Y, 48.0],
  ];
  for (const [id, x, y, z] of barrelCoords) {
    buildExplosiveBarrel(collector, mats, { id, x, y, z, blastRadius: 5.8 });
  }

  // 6. Keep the Final Boss Colosseum floor pure & ominous (NO cyan shooting-range boards in the Boss Pit!) —
  //    only high-altitude Orbital Eclipse Sentinels & Crucible Energy Canisters float overhead for tactical sightline calibration!
  const targetsRes = buildTargetsFromSpecs(group, {
    dummies: [],
    steelPlates: [],
    canisters: [
      { id: 'f1_can_crucible_w', x: -15.2, y: F1_L2_Y, z: 40.0 },
      { id: 'f1_can_crucible_e', x: 15.2, y: F1_L2_Y, z: 40.0 },
      { id: 'f1_can_apex_w', x: -40.6, y: F1_L3_Y, z: 36.5 },
      { id: 'f1_can_apex_e', x: 40.6, y: F1_L3_Y, z: 43.5 },
    ],
    drones: [
      { id: 'f1_drone_eclipse_low', x: 0, y: F1_L0_Y + 5.8, z: 27.0, amp: 14.0, phase: 0, axis: 'x' },
      { id: 'f1_drone_eclipse_mid', x: 0, y: F1_L1_Y + 3.8, z: 53.0, amp: 14.0, phase: 2.1, axis: 'x' },
      { id: 'f1_drone_eclipse_high', x: 0, y: F1_L2_Y + 4.8, z: 40.0, amp: 16.0, phase: 4.2, axis: 'z' },
    ],
  });

  // 7. 10 Heavy .50 HV Boss-Fight Ammo Crates strategically stocked across Overlook, Pit, Vaults, Crucibles, Apexes & Sanctum!
  const cratesRes = buildAmmoCratesFromSpecs(group, [
    // Overlook staging crate right before dropping into Boss Pit
    { id: 'f1_crate_overlook', x: -5.8, y: F1_L2_Y, z: 0.4, rotY: 0.35 },
    // Boss Pit flank crates behind solid cover walls
    { id: 'f1_crate_pit_nw', x: -18.5, y: F1_L0_Y, z: 23.4, rotY: 0.1 },
    { id: 'f1_crate_pit_se', x: 18.5, y: F1_L0_Y, z: 56.6, rotY: Math.PI },
    // Sealed Reliquary Armory Vault high-value ammo caches!
    { id: 'f1_crate_vault_w', x: -39.8, y: F1_L0_Y, z: 32.8, rotY: Math.PI * 0.5 },
    { id: 'f1_crate_vault_e', x: 39.8, y: F1_L0_Y, z: 47.2, rotY: -Math.PI * 0.5 },
    // Suspended Crucible Weapon Island caches!
    { id: 'f1_crate_crucible_w', x: -15.2, y: F1_L2_Y, z: 41.8, rotY: 0.4 },
    { id: 'f1_crate_crucible_e', x: 15.2, y: F1_L2_Y, z: 38.2, rotY: -2.7 },
    // Twin L3 Apex Vantage Crown sniper caches
    { id: 'f1_crate_apex_w', x: -41.4, y: F1_L3_Y, z: 40.0, rotY: Math.PI * 0.5 },
    { id: 'f1_crate_apex_e', x: 41.4, y: F1_L3_Y, z: 40.0, rotY: -Math.PI * 0.5 },
    // Inner Victory Sanctum bonus cache
    { id: 'f1_crate_sanctum', x: 4.8, y: F1_L0_Y, z: 90.2, rotY: -Math.PI * 0.4 },
  ]);

  return {
    meta: F1_META,
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
    exitDoor,
    arrivalDoor,
    tacticalDoors: collector.tacticalDoors,
    retractableBridges: collector.retractableBridges,
    securityGates: collector.securityGates,
    shootableLocks: collector.shootableLocks,
    jumpPads: collector.jumpPads,
    worldSwitches: collector.worldSwitches,
    explosiveBarrels: collector.explosiveBarrels,
    animatedSpinners: collector.animatedSpinners,
    controlCenter,
    // Dramatic Blood-Eclipse Ember & Burnished Sovereign Gold Cathedral Boss Lighting Preset
    lightPreset: {
      hemiSky: 0xffe4be, // Warm gilded cathedral zenith radiance across 24.6m height
      hemiGround: 0x24130f, // Deep volcanic obsidian-ember shadow bounce
      hemiIntensity: 1.15,
      keyColor: 0xfff0d6,
      keyIntensity: 2.55,
      keyOffset: [16, 11.5, 18],
      fillColor: 0xea4218, // Molten volcanic blood-ember rim light (never pastel pink!)
      fillIntensity: 0.95,
      fogColor: 0x160b09, // Rich dark volcanic ember-obsidian atmosphere
      fogDensity: 0.0062, // Crisp long-range visibility across the entire 88m Colosseum
      pointLights: [
        // Blazing Blood-Eclipse Singularity heart casting molten-ember radiance onto the Boss Throne Dais
        { color: 0xff3d12, intensity: 52, distance: 68, x: 0, yOffset: 3.5, z: F1_GRID.CZ },
        // Sovereign Gold warmth illuminating the Central Boss Pit, Dais & Monumental Pillars
        { color: 0xfbbf24, intensity: 46, distance: 60, x: 0, yOffset: -7.5, z: F1_GRID.CZ },
        // Omen Vestibule & Viewing Overlook dramatic molten-gold beacon
        { color: 0xf97316, intensity: 28, distance: 38, x: 0, yOffset: 3.8, z: -4.0 },
        // South Sovereign Control Center & Final Core Vault 01 golden spotlight
        { color: 0xf59e0b, intensity: 34, distance: 46, x: 0, yOffset: -3.5, z: 81.0 },
      ],
    },
    spawnPoint: { ...F1_SPAWN },
    bounds: {
      minX: F1_GRID.X_MIN - 2,
      maxX: F1_GRID.X_MAX + 2,
      minZ: F1_GRID.Z_ARRIVAL - 20,
      maxZ: F1_GRID.Z_SANCTUM_END + 2,
    },
    minSafeY: F1_MIN_SAFE_Y,
    entryThreshold: {
      minX: -9.5,
      maxX: 9.5,
      minZ: -15.5,
      maxZ: 4.5,
      maxY: F1_L2_Y + 4.8,
    },
    dispose: () => {
      targetsRes.dispose();
      cratesRes.dispose();
      const sing = group.getObjectByName('F1_BlackSunSingularity');
      if (sing?.userData?.customMat instanceof THREE.Material) {
        sing.userData.customMat.dispose();
      }
      if (sing?.userData?.beamMat instanceof THREE.Material) {
        sing.userData.beamMat.dispose();
      }
    },
  };
}
