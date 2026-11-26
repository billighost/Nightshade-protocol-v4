import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../../materials';
import {
  addWalkableDeck,
  buildArchitecturalWall,
} from '../../architecture';
import {
  buildStraightStairFlight,
  type FloorGeometryCollector,
} from '../../stairs';
import {
  F1_GRID,
  F1_L0_Y,
  F1_L2_Y,
  F1_ROOF_CENTER_Y,
  F1_ROOF_THICK,
  F1_ROOF_UNDERSIDE_Y,
  F1_WALL_HEIGHT,
} from './layout';

/**
 * FLOOR 01 — COLOSSAL 88m × 88m × 24.6m OBSIDIAN COLOSSEUM SHELL,
 * BLACK-SUN ECLIPSE SINGULARITY, CENTRAL BOSS THRONE DAIS,
 * 8 MONUMENTAL COVER PILLARS & 8 SOLID TACTICAL COVER WALLS.
 *
 * Designed specifically for an unforgettable high-intensity Boss Fight:
 * - Massive uninterrupted 24.6m-high cathedral-colosseum volume (Halo Forerunner + Soulsborne/DOOM Eternal scale).
 * - Hovering pitch-black Singularity & blazing Blood-Eclipse Corona rings overhead (`y = +2.6..+9.2m`) that
 *   instantly fill the operative with dread from the Sovereign Overlook!
 * - Stepped walkable Central Boss Throne Dais (`(0, -11.2, 40.0)`) with 4 wide cardinal stairways.
 * - 8 thick 2.2m × 24.5m Carved Bone-Stone & Obsidian Cover Pillars (`r = 17.5m`) that break heavy boss sightlines.
 * - 8 solid 3.2m-tall Tactical Blast-Shield Cover Walls with flanking half-height crouch-peek wings so the player
 *   can constantly run, kite, hide, reload, and counter-attack around the entire arena!
 */
export function buildFloor1ShellAndCenterpiece(
  collector: FloorGeometryCollector,
  detailGroup: THREE.Group,
  mats: HideoutMaterialRegistry
): void {
  const y0 = F1_L0_Y; // -12.0m
  const cx = F1_GRID.CX; // 0
  const cz = F1_GRID.CZ; // 40.0
  const group = collector.group;

  // 1. Monolithic Sunken Obsidian Boss Colosseum Floor (`88m × 88m`, y = -12.0m)
  addWalkableDeck(collector, {
    minX: F1_GRID.X_MIN + 0.32,
    maxX: F1_GRID.X_MAX - 0.32,
    minZ: F1_GRID.Z_NORTH + 0.32,
    maxZ: F1_GRID.Z_SOUTH - 0.32,
    y: y0,
    thickness: 0.62,
    material: mats.obsidianBasalt,
    name: 'F1_ColosseumFloorL0',
  });

  // 2. Four Watertight 24.6m-Tall Outer Colosseum Perimeter Walls (strictly trimmed at corners -> ZERO Z-fighting!)
  // North Wall (`z = -4.0`) with monumental Vestibule Archway (`x ∈ [-8.8, +8.8], y ∈ [0.0, +8.4]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F1_GRID.Z_NORTH,
    spanStart: F1_GRID.X_MIN - 0.31,
    spanEnd: F1_GRID.X_MAX + 0.31,
    baseY: y0,
    height: F1_WALL_HEIGHT,
    thickness: 0.62,
    wallMat: mats.obsidianBasalt,
    accentMat: mats.sovereignGold,
    portals: [
      {
        start: -8.8,
        end: 8.8,
        bottomY: F1_L2_Y,
        topY: F1_L2_Y + 8.4,
        kind: 'door',
        framed: true,
        accentHeader: true,
      },
    ],
    name: 'F1_NorthColosseumWall',
  });

  // South Wall (`z = +84.0`) with colossal Final Core Vault 01 Portal (`6.8m × 6.5m`, `y ∈ [-12.0, -5.5]`)
  buildArchitecturalWall(collector, mats, {
    axis: 'x',
    coord: F1_GRID.Z_SOUTH,
    spanStart: F1_GRID.X_MIN - 0.31,
    spanEnd: F1_GRID.X_MAX + 0.31,
    baseY: y0,
    height: F1_WALL_HEIGHT,
    thickness: 0.62,
    wallMat: mats.obsidianBasalt,
    accentMat: mats.sovereignGold,
    portals: [
      {
        start: -3.4,
        end: 3.4,
        bottomY: y0,
        topY: y0 + 6.5,
        kind: 'door',
        framed: false,
      },
    ],
    name: 'F1_SouthColosseumWall',
  });

  // West (`x = -44.0`) & East (`x = +44.0`) Perimeter Walls trimmed cleanly inside North/South walls
  for (const side of [-1, 1] as const) {
    buildArchitecturalWall(collector, mats, {
      axis: 'z',
      coord: side < 0 ? F1_GRID.X_MIN : F1_GRID.X_MAX,
      spanStart: F1_GRID.Z_NORTH + 0.32,
      spanEnd: F1_GRID.Z_SOUTH - 0.32,
      baseY: y0,
      height: F1_WALL_HEIGHT,
      thickness: 0.62,
      wallMat: mats.obsidianBasalt,
      name: side < 0 ? 'F1_WestColosseumWall' : 'F1_EastColosseumWall',
    });
  }

  // 3. Single Monolithic Colosseum Roof Slab (`top = +13.08m < 13.34m` Floor 02 -> ZERO roof seam overlaps!)
  const roofSlab = buildBatchedBoxesMesh(
    [
      {
        w: F1_GRID.X_MAX - F1_GRID.X_MIN + 0.64,
        h: F1_ROOF_THICK,
        d: F1_GRID.Z_SOUTH - F1_GRID.Z_NORTH + 0.64,
        x: cx,
        y: F1_ROOF_CENTER_Y,
        z: cz,
      },
    ],
    mats.obsidianBasalt,
    { receiveShadow: true, name: 'F1_ColosseumRoofSlab' }
  );
  if (roofSlab) {
    group.add(roofSlab);
    collector.wallMeshes.push(roofSlab);
  }

  // 4. Vaulted Cathedral Buttress Ceiling Ribs + Blazing Overhead Eclipse Oculus Halo (`y = 11.4..12.56m`)
  const vaultStoneSpecs: BoxSpec[] = [];
  const vaultGoldSpecs: BoxSpec[] = [];
  const vaultCrimsonSpecs: BoxSpec[] = [];

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const ribR = 26.5;
    const rx = cx + Math.cos(angle) * ribR;
    const rz = cz + Math.sin(angle) * ribR;
    // Heavy radial stone cathedral beam spanning from outer walls toward central Oculus ring
    vaultStoneSpecs.push({
      w: 31.0,
      h: 0.74,
      d: 1.1,
      x: rx,
      y: F1_ROOF_UNDERSIDE_Y - 0.42,
      z: rz,
      rotY: -angle,
    });
    vaultGoldSpecs.push({
      w: 28.0,
      h: 0.16,
      d: 0.36,
      x: rx,
      y: F1_ROOF_UNDERSIDE_Y - 0.86,
      z: rz,
      rotY: -angle,
    });
  }

  // Perimeter colossal fluted wall pilasters (every 16m along North/South/East/West outer walls for monumental rhythm!)
  for (const offset of [-32, -16, 16, 32]) {
    for (const wz of [F1_GRID.Z_NORTH + 0.52, F1_GRID.Z_SOUTH - 0.52]) {
      vaultStoneSpecs.push({ w: 1.15, h: F1_WALL_HEIGHT - 0.2, d: 0.42, x: offset, y: y0 + F1_WALL_HEIGHT * 0.5, z: wz });
      vaultCrimsonSpecs.push({ w: 0.14, h: 16.0, d: 0.08, x: offset, y: y0 + 11.5, z: wz + (wz < cz ? 0.25 : -0.25) });
    }
    for (const wx of [F1_GRID.X_MIN + 0.52, F1_GRID.X_MAX - 0.52]) {
      vaultStoneSpecs.push({ w: 0.42, h: F1_WALL_HEIGHT - 0.2, d: 1.15, x: wx, y: y0 + F1_WALL_HEIGHT * 0.5, z: cz + offset });
      vaultCrimsonSpecs.push({ w: 0.08, h: 16.0, d: 0.14, x: wx + (wx < 0 ? 0.25 : -0.25), y: y0 + 11.5, z: cz + offset });
    }
  }

  // Colossal Overhead Blood-Eclipse Oculus Halo (`r = 12.2m`)
  const oculusOuter = new THREE.Mesh(
    new THREE.TorusGeometry(12.2, 0.52, 10, 48),
    mats.sovereignGold
  );
  oculusOuter.rotation.x = Math.PI * 0.5;
  oculusOuter.position.set(cx, F1_ROOF_UNDERSIDE_Y - 0.65, cz);
  oculusOuter.name = 'F1_CeilingOculusGold';
  detailGroup.add(oculusOuter);

  const oculusGlow = new THREE.Mesh(
    new THREE.TorusGeometry(11.3, 0.22, 8, 48),
    mats.eclipseCrimson
  );
  oculusGlow.rotation.x = Math.PI * 0.5;
  oculusGlow.position.set(cx, F1_ROOF_UNDERSIDE_Y - 0.85, cz);
  oculusGlow.name = 'F1_CeilingOculusCrimson';
  detailGroup.add(oculusGlow);

  // 5. HERO CENTERPIECE: THE HOVERING BLACK-SUN ECLIPSE SINGULARITY (`y = +5.6m`, 17.6m above Boss Floor!)
  //    Terrifying cosmic-sovereign boss omen visible the instant you step onto the Viewing Overlook!
  const singularityGroup = new THREE.Group();
  singularityGroup.name = 'F1_BlackSunSingularity';
  singularityGroup.position.set(cx, 5.6, cz);
  group.add(singularityGroup);

  const voidMat = new THREE.MeshStandardMaterial({
    color: 0x050308,
    roughness: 0.18,
    metalness: 0.92,
  });
  // Register on group userData so Floor 01 dispose cleans up this unique void material cleanly
  singularityGroup.userData.customMat = voidMat;

  const voidSphere = new THREE.Mesh(new THREE.SphereGeometry(2.85, 24, 18), voidMat);
  voidSphere.name = 'F1_BlackSunCore';
  singularityGroup.add(voidSphere);

  // Blazing Blood-Eclipse Solar Corona Halo facing North-South toward the Overlook!
  const coronaTorus = new THREE.Mesh(
    new THREE.TorusGeometry(3.45, 0.24, 10, 44),
    mats.eclipseCrimson
  );
  coronaTorus.name = 'F1_BlackSunCorona';
  singularityGroup.add(coronaTorus);

  // 3 Gigantic Counter-Rotating Gyroscopic Obsidian/Gold/Crimson Celestial Rings
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(4.85, 0.22, 8, 48), mats.sovereignGold);
  ring1.rotation.x = 0.65;
  ring1.name = 'F1_EclipseRing1';
  singularityGroup.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(6.15, 0.28, 8, 48), mats.obsidianBasalt);
  ring2.rotation.y = 0.9;
  ring2.rotation.z = 0.45;
  ring2.name = 'F1_EclipseRing2';
  singularityGroup.add(ring2);

  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(7.35, 0.16, 8, 52), mats.eclipseCrimson);
  ring3.rotation.x = -0.55;
  ring3.name = 'F1_EclipseRing3';
  singularityGroup.add(ring3);

  collector.animatedSpinners?.push(
    { obj: ring1, speed: 0.34, axis: 'y' },
    { obj: ring2, speed: -0.24, axis: 'x' },
    { obj: ring3, speed: 0.18, axis: 'z' }
  );

  // Translucent Blood-Eclipse Descent Beam connecting the Black-Sun Singularity down onto the Boss Throne Dais!
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xff3b10,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  singularityGroup.userData.beamMat = beamMat;
  const descentBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 3.1, 15.6, 24, 1, true),
    beamMat
  );
  descentBeam.position.set(0, -8.8, 0);
  descentBeam.name = 'F1_EclipseDescentBeam';
  singularityGroup.add(descentBeam);

  // 6. CENTRAL BOSS THRONE DAIS (`(0, -11.2, 40.0)`, 16.4m × 16.4m stepped arena platform + 4 cardinal stairs)
  const daisY = y0 + 0.8; // -11.2m
  addWalkableDeck(collector, {
    minX: -8.2,
    maxX: 8.2,
    minZ: cz - 8.2,
    maxZ: cz + 8.2,
    y: daisY,
    thickness: 0.78, // Bottom at -11.98m -> cleanly 2cm above L0 floor, zero coplanar bottom!
    material: mats.sacredBoneStone,
    castShadow: true,
    name: 'F1_BossThroneDais',
  });

  // Glowing sovereign eclipse emblem ring inlaid cleanly proud of the Boss Throne center (`+12mm` -> zero Z-fight!)
  const daisRingGold = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.14, 8, 40), mats.sovereignGold);
  daisRingGold.rotation.x = Math.PI * 0.5;
  daisRingGold.position.set(cx, daisY + 0.04, cz);
  detailGroup.add(daisRingGold);

  const daisRingCrimson = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.09, 8, 36), mats.eclipseCrimson);
  daisRingCrimson.rotation.x = Math.PI * 0.5;
  daisRingCrimson.position.set(cx, daisY + 0.035, cz);
  detailGroup.add(daisRingCrimson);

  // 4 Corner Sovereign Fire-Braziers crowning the Boss Throne Dais corners (`(±6.8, daisY, 40 ± 6.8)`)
  for (const sx of [-6.8, 6.8]) {
    for (const szOff of [-6.8, 6.8]) {
      const bz = cz + szOff;
      vaultStoneSpecs.push({ w: 0.82, h: 1.08, d: 0.82, x: sx, y: daisY + 0.55, z: bz });
      vaultGoldSpecs.push(
        { w: 0.98, h: 0.12, d: 0.98, x: sx, y: daisY + 1.16, z: bz }
      );
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), mats.eclipseCrimson);
      flame.scale.set(0.85, 1.6, 0.85);
      flame.position.set(sx, daisY + 1.72, bz);
      flame.name = `F1_DaisFlame_${sx < 0 ? 'W' : 'E'}_${szOff < 0 ? 'N' : 'S'}`;
      detailGroup.add(flame);
      collector.animatedSpinners?.push({ obj: flame, speed: sx * szOff > 0 ? 1.05 : -1.05, axis: 'y' });
      collector.boxes.push({
        minX: sx - 0.52,
        maxX: sx + 0.52,
        minY: daisY,
        maxY: daisY + 2.1,
        minZ: bz - 0.52,
        maxZ: bz + 0.52,
        walkableTop: false,
      });
    }
  }

  // 4 Wide Cardinal Processional Stairs ascending smoothly onto the Boss Throne Dais (`-12.0 -> -11.2`)
  buildStraightStairFlight(collector, mats, {
    x: cx,
    z: cz - 9.4,
    width: 4.8,
    length: 2.4,
    yStart: y0,
    yEnd: daisY,
    axis: 'z',
    steps: 4,
    railMinSide: false,
    railMaxSide: false,
    accentMat: mats.sovereignGold,
  });
  buildStraightStairFlight(collector, mats, {
    x: cx,
    z: cz + 9.4,
    width: 4.8,
    length: 2.4,
    yStart: daisY,
    yEnd: y0,
    axis: 'z',
    steps: 4,
    railMinSide: false,
    railMaxSide: false,
    accentMat: mats.sovereignGold,
  });
  buildStraightStairFlight(collector, mats, {
    x: -9.4,
    z: cz,
    width: 4.8,
    length: 2.4,
    yStart: y0,
    yEnd: daisY,
    axis: 'x',
    steps: 4,
    railMinSide: false,
    railMaxSide: false,
    accentMat: mats.sovereignGold,
  });
  buildStraightStairFlight(collector, mats, {
    x: 9.4,
    z: cz,
    width: 4.8,
    length: 2.4,
    yStart: daisY,
    yEnd: y0,
    axis: 'x',
    steps: 4,
    railMinSide: false,
    railMaxSide: false,
    accentMat: mats.sovereignGold,
  });

  // Floor Sovereign Gold & Crimson Radial Arena Rings on L0 (lifted +10mm proud -> zero Z-fighting!)
  const arenaRingOuter = new THREE.Mesh(new THREE.TorusGeometry(21.5, 0.14, 6, 64), mats.sovereignGold);
  arenaRingOuter.rotation.x = Math.PI * 0.5;
  arenaRingOuter.position.set(cx, y0 + 0.02, cz);
  detailGroup.add(arenaRingOuter);

  const arenaRingInner = new THREE.Mesh(new THREE.TorusGeometry(13.6, 0.1, 6, 48), mats.eclipseCrimson);
  arenaRingInner.rotation.x = Math.PI * 0.5;
  arenaRingInner.position.set(cx, y0 + 0.02, cz);
  detailGroup.add(arenaRingInner);

  // 7. 8 MONUMENTAL 24.5m-TALL FULL-HEIGHT COVER PILLARS (`r = 17.5m` at 22.5° + k*45°)
  //    Thick 2.2m × 2.2m carved bone-stone & obsidian monoliths for breaking Boss Beams & Line-of-Sight!
  const pillarStoneSpecs: BoxSpec[] = [];
  const pillarDarkSpecs: BoxSpec[] = [];
  const pillarGoldSpecs: BoxSpec[] = [];
  const pillarCrimsonSpecs: BoxSpec[] = [];

  const pillarH = F1_WALL_HEIGHT - 0.12; // 24.48m, cleanly between L0 (+0.02) and roof underside (-0.10)
  const pillarR = 17.6;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8; // 22.5°, 67.5°, ... leaves all 4 cardinal avenues wide open!
    const px = cx + Math.cos(a) * pillarR;
    const pz = cz + Math.sin(a) * pillarR;

    // Stepped obsidian base plinth (`y0 + 0.01 .. y0 + 0.62`)
    pillarDarkSpecs.push({ w: 2.66, h: 0.6, d: 2.66, x: px, y: y0 + 0.31, z: pz });
    // Main colossal carved bone-stone shaft (`y0 + 0.63 .. y0 + pillarH - 0.64`)
    const shaftH = pillarH - 1.28;
    pillarStoneSpecs.push({ w: 2.18, h: shaftH, d: 2.18, x: px, y: y0 + 0.63 + shaftH * 0.5, z: pz });
    // Crown obsidian capital cleanly below roof slab
    pillarDarkSpecs.push({ w: 2.66, h: 0.62, d: 2.66, x: px, y: y0 + pillarH - 0.31, z: pz });
    // Sovereign gold collar bands (strictly proud of shaft -> zero Z-fighting!)
    for (const bandY of [y0 + 3.4, y0 + 9.2, y0 + 16.0, y0 + 21.8]) {
      pillarGoldSpecs.push({ w: 2.34, h: 0.26, d: 2.34, x: px, y: bandY, z: pz });
    }
    // Blazing crimson rune veins running vertically up the inner-facing & outer-facing sides (staggered heights -> zero cap overlap!)
    pillarCrimsonSpecs.push(
      { w: 0.18, h: 14.0, d: 2.26, x: px, y: y0 + 11.2, z: pz },
      { w: 2.26, h: 13.92, d: 0.18, x: px, y: y0 + 11.2, z: pz }
    );

    collector.boxes.push({
      minX: px - 1.32,
      maxX: px + 1.32,
      minY: y0,
      maxY: F1_ROOF_UNDERSIDE_Y,
      minZ: pz - 1.32,
      maxZ: pz + 1.32,
      walkableTop: false,
      tag: 'colosseum_pillar',
    });
  }

  // 8. 8 SOLID TACTICAL BLAST-SHIELD COVER WALLS (`h = 3.2m` core + `h = 1.25m` flanking crouch-fire wings!)
  //    Placed in an outer tactical ring (`r = 25.0m` diagonals + North/South flanking shields) — 100% solid cover
  //    to hide behind, reload, and kite the Boss around without EVER blocking Jump Pads, Stairs, or Spiral Towers!
  const coverWalls: Array<{ x: number; z: number; along: 'x' | 'z' }> = [
    // 4 Diagonal Quadrant Blast-Shield Fort Walls (r ≈ 25m, crystal-clear of Spiral Towers at ±28,40!)
    { x: -18.5, z: 21.5, along: 'x' },
    { x: 18.5, z: 21.5, along: 'x' },
    { x: -18.5, z: 58.5, along: 'x' },
    { x: 18.5, z: 58.5, along: 'x' },
    // 2 North Arena Approach Shield Walls (framing drop-down from Omen Overlook!)
    { x: -9.5, z: 12.8, along: 'x' },
    { x: 9.5, z: 12.8, along: 'x' },
    // 2 South Arena Vault Shield Walls (framing approach to Final Core Vault 01!)
    { x: -9.5, z: 67.2, along: 'x' },
    { x: 9.5, z: 67.2, along: 'x' },
  ];

  for (const cw of coverWalls) {
    // Central tall solid hide-behind wall (`w = 4.6m, h = 3.2m, d = 0.86m`)
    const wallW = cw.along === 'x' ? 4.6 : 0.86;
    const wallD = cw.along === 'x' ? 0.86 : 4.6;
    // Base plinth (`+0.01..+0.35`), carved stone core (`+0.36..+2.94`), gold cap (`+2.95..+3.20`)
    pillarDarkSpecs.push({ w: wallW + 0.16, h: 0.34, d: wallD + 0.16, x: cw.x, y: y0 + 0.18, z: cw.z });
    pillarStoneSpecs.push({ w: wallW, h: 2.58, d: wallD, x: cw.x, y: y0 + 0.36 + 1.29, z: cw.z });
    pillarGoldSpecs.push({ w: wallW + 0.12, h: 0.24, d: wallD + 0.12, x: cw.x, y: y0 + 3.07, z: cw.z });
    pillarCrimsonSpecs.push({
      w: cw.along === 'x' ? wallW - 0.6 : wallW + 0.08,
      h: 0.12,
      d: cw.along === 'x' ? wallD + 0.08 : wallD - 0.6,
      x: cw.x,
      y: y0 + 2.32,
      z: cw.z,
    });
    collector.boxes.push({
      minX: cw.x - (wallW + 0.16) * 0.5,
      maxX: cw.x + (wallW + 0.16) * 0.5,
      minY: y0,
      maxY: y0 + 3.22,
      minZ: cw.z - (wallD + 0.16) * 0.5,
      maxZ: cw.z + (wallD + 0.16) * 0.5,
      walkableTop: false,
      tag: 'tactical_cover_wall',
    });

    // Twin flanking chest-high peek/crouch wings (`h = 1.22m`, walkable top for quick vaulting!)
    for (const s of [-1, 1] as const) {
      const wx = cw.along === 'x' ? cw.x + s * 3.15 : cw.x;
      const wz = cw.along === 'x' ? cw.z : cw.z + s * 3.15;
      const wingW = cw.along === 'x' ? 1.48 : 0.72;
      const wingD = cw.along === 'x' ? 0.72 : 1.48;
      pillarStoneSpecs.push({ w: wingW, h: 1.06, d: wingD, x: wx, y: y0 + 0.01 + 0.53, z: wz });
      pillarGoldSpecs.push({ w: wingW + 0.06, h: 0.14, d: wingD + 0.06, x: wx, y: y0 + 1.15, z: wz });
      collector.boxes.push({
        minX: wx - wingW * 0.5,
        maxX: wx + wingW * 0.5,
        minY: y0,
        maxY: y0 + 1.22,
        minZ: wz - wingD * 0.5,
        maxZ: wz + wingD * 0.5,
        walkableTop: true,
        tag: 'cover',
      });
    }
  }

  // Batch emit all shell vault, pillar & cover-wall meshes cleanly (tiny draw-call count!)
  const vaultStoneMesh = buildBatchedBoxesMesh(vaultStoneSpecs, mats.obsidianBasalt, {
    receiveShadow: true,
    name: 'F1_VaultRibsAndPilasters',
  });
  if (vaultStoneMesh) {
    group.add(vaultStoneMesh);
    collector.wallMeshes.push(vaultStoneMesh);
  }
  const vaultGoldMesh = buildBatchedBoxesMesh(vaultGoldSpecs, mats.sovereignGold, {
    name: 'F1_VaultGoldRibs',
  });
  if (vaultGoldMesh) detailGroup.add(vaultGoldMesh);
  const vaultCrimsonMesh = buildBatchedBoxesMesh(vaultCrimsonSpecs, mats.eclipseCrimson, {
    name: 'F1_VaultCrimsonPilasters',
  });
  if (vaultCrimsonMesh) detailGroup.add(vaultCrimsonMesh);

  const pStoneMesh = buildBatchedBoxesMesh(pillarStoneSpecs, mats.sacredBoneStone, {
    castShadow: true,
    receiveShadow: true,
    name: 'F1_ColosseumPillarsAndCoverWalls',
  });
  if (pStoneMesh) {
    group.add(pStoneMesh);
    collector.wallMeshes.push(pStoneMesh);
  }
  const pDarkMesh = buildBatchedBoxesMesh(pillarDarkSpecs, mats.obsidianBasalt, {
    castShadow: true,
    receiveShadow: true,
    name: 'F1_PillarPlinthsAndCaps',
  });
  if (pDarkMesh) {
    group.add(pDarkMesh);
    collector.wallMeshes.push(pDarkMesh);
  }
  const pGoldMesh = buildBatchedBoxesMesh(pillarGoldSpecs, mats.sovereignGold, {
    name: 'F1_PillarGoldCollars',
  });
  if (pGoldMesh) detailGroup.add(pGoldMesh);
  const pCrimsonMesh = buildBatchedBoxesMesh(pillarCrimsonSpecs, mats.eclipseCrimson, {
    name: 'F1_PillarCrimsonVeins',
  });
  if (pCrimsonMesh) detailGroup.add(pCrimsonMesh);
}
