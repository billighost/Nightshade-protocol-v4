import * as THREE from 'three';
import {
  buildBatchedBoxesMesh,
  type BoxSpec,
  type HideoutMaterialRegistry,
} from '../materials';
import type { FloorGeometryCollector } from '../stairs';
import type { ColliderBox3D, TacticalDoorMode, TacticalDoorRig } from '../types';

export interface TacticalDoorOptions {
  id: string;
  mode: TacticalDoorMode;
  x: number;
  y: number;
  z: number;
  /** Portal full span width (leaves tuck cleanly inside the 0.22m architectural jambs) */
  width: number;
  /** Portal clear height */
  height: number;
  /** 'x' = spans along X (wall runs along X, player walks through along Z); 'z' = spans along Z (player walks along X) */
  spanAxis: 'x' | 'z';
  triggerDistance?: number;
  closeDistance?: number;
  /** Clear floor-to-shutter gap when a 'jammed_roll' shutter hits its mechanical stop (default 1.16m) */
  jammedClearance?: number;
  /** Optional target Three.js group (defaults to collector.group — useful for OcclusionCells!) */
  targetGroup?: THREE.Group;
}

export interface TacticalDoorEvent {
  kind: 'slide_open' | 'slide_close' | 'jam_clunk';
  doorId: string;
}

const AUTO_OPEN_DURATION = 0.85;
const AUTO_CLOSE_DURATION = 0.95;
const JAM_OPEN_DURATION = 0.95;
const JAM_CLOSE_DURATION = 1.05;
const JAM_REST_GAP = 0.18;

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Reusable AAA Interior Tactical Door Builder:
 * - `mode: 'automatic'`: Twin-leaf motorized armored sliding blast door with brushed steel edge bumpers,
 *   horizontal armor ribs, glowing status seam & overhead indicator bar (Amber Standby → Cyan Open).
 *   Smoothly slides open over ~0.85s on proximity (NEVER instant!) and closes smoothly behind the player.
 * - `mode: 'jammed_roll'`: Heavy vertical overhead blast shutter with industrial guide tracks,
 *   diagonal hazard bottom bumper, and flickering amber/crimson malfunction beacons. Starts cracked 0.18m,
 *   lifts smoothly on approach until slamming into a mechanical jam at `1.16m` with damped shudder bounce —
 *   blocking standing (`1.75m`) & crouching (`1.28m`) while letting a **dodge roll (`0.84m`)** glide right under!
 */
export function buildTacticalDoor(
  collector: FloorGeometryCollector,
  mats: HideoutMaterialRegistry,
  opts: TacticalDoorOptions
): TacticalDoorRig {
  const {
    id,
    mode,
    x,
    y,
    z,
    width,
    height,
    spanAxis,
    triggerDistance = mode === 'jammed_roll' ? 5.6 : 4.6,
    closeDistance = mode === 'jammed_roll' ? 7.8 : 5.8,
    jammedClearance = 1.16,
    targetGroup,
  } = opts;

  const hostGroup = targetGroup ?? collector.group;
  const root = new THREE.Group();
  root.name = `TacticalDoor_${id}`;
  root.position.set(x, y, z);
  // Local +X = door span axis, local +Z = passage normal (walk-through direction)
  if (spanAxis === 'z') {
    root.rotation.y = Math.PI * 0.5;
  }
  hostGroup.add(root);

  const clearW = Math.max(1.6, width - 0.44);
  const clearH = Math.max(2.4, height - 0.26);
  const doorThick = 0.22;
  const colHalfDepth = mode === 'jammed_roll' ? 0.26 : 0.22;
  const colHalfSpan = clearW * 0.5 + 0.14;

  const collider: ColliderBox3D =
    spanAxis === 'x'
      ? {
          id: `tdoor_${id}`,
          minX: x - colHalfSpan,
          maxX: x + colHalfSpan,
          minY: y,
          maxY: y + height,
          minZ: z - colHalfDepth,
          maxZ: z + colHalfDepth,
          active: true,
          walkableTop: false,
          tag: mode === 'jammed_roll' ? 'jammed_door' : 'tactical_door',
        }
      : {
          id: `tdoor_${id}`,
          minX: x - colHalfDepth,
          maxX: x + colHalfDepth,
          minY: y,
          maxY: y + height,
          minZ: z - colHalfSpan,
          maxZ: z + colHalfSpan,
          active: true,
          walkableTop: false,
          tag: mode === 'jammed_roll' ? 'jammed_door' : 'tactical_door',
        };
  collector.boxes.push(collider);

  const raycastMeshes: THREE.Object3D[] = [];

  if (mode === 'automatic') {
    const leafW = clearW * 0.5 - 0.01;
    const leafH = clearH - 0.02;
    const slideDist = leafW * 0.92;

    const statusMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.5,
      roughness: 0.25,
      metalness: 0.2,
    });

    // Overhead recessed track housing & cleanly butt-jointed vertical side tracks (8mm clear above wall jamb base)
    const sideTrackH = clearH - 0.06;
    const trackHousing = buildBatchedBoxesMesh(
      [
        { w: clearW + 0.16, h: 0.18, d: 0.44, x: 0, y: clearH + 0.06, z: 0 },
        { w: 0.06, h: sideTrackH, d: 0.34, x: -(clearW * 0.5 - 0.045), y: 0.014 + sideTrackH * 0.5, z: 0 },
        { w: 0.06, h: sideTrackH, d: 0.34, x: clearW * 0.5 - 0.045, y: 0.014 + sideTrackH * 0.5, z: 0 },
      ],
      mats.structuralSteel,
      { name: `${id}_Track` }
    );
    if (trackHousing) root.add(trackHousing);

    const headerBeacon = new THREE.Mesh(
      new THREE.BoxGeometry(clearW * 0.44, 0.065, 0.52),
      statusMat
    );
    headerBeacon.position.set(0, clearH + 0.06, 0);
    root.add(headerBeacon);

    const buildLeaf = (side: -1 | 1): THREE.Group => {
      const leaf = new THREE.Group();
      leaf.position.set(side * (leafW * 0.5 + 0.01), 0, 0);

      // Primary armored leaf body (cleanly stepped inside outer pocket & leading bumper cap — ZERO coplanar faces!)
      const bodySpecs: BoxSpec[] = [
        { w: leafW - 0.14, h: leafH, d: doorThick, x: side * 0.04, y: leafH * 0.5 + 0.01, z: 0 },
      ];
      const bodyMesh = buildBatchedBoxesMesh(bodySpecs, mats.armoredSteel, {
        castShadow: true,
        receiveShadow: true,
        name: `${id}_LeafBody_${side > 0 ? 'R' : 'L'}`,
      });
      if (bodyMesh) {
        leaf.add(bodyMesh);
        raycastMeshes.push(bodyMesh);
      }

      // Recessed horizontal structural stiffening ribs & diagonal corner plates
      const ribSpecs: BoxSpec[] = [
        { w: leafW - 0.28, h: 0.16, d: doorThick + 0.04, x: side * 0.06, y: leafH * 0.24, z: 0 },
        { w: leafW - 0.28, h: 0.16, d: doorThick + 0.04, x: side * 0.06, y: leafH * 0.76, z: 0 },
        { w: leafW - 0.36, h: 0.52, d: doorThick + 0.025, x: side * 0.06, y: leafH * 0.5, z: 0 },
      ];
      const ribMesh = buildBatchedBoxesMesh(ribSpecs, mats.structuralSteel, {
        receiveShadow: true,
        name: `${id}_LeafRibs_${side > 0 ? 'R' : 'L'}`,
      });
      if (ribMesh) leaf.add(ribMesh);

      // Brushed metal inner leading-edge bumper cap + handle channel (cleanly wraps LeafBody edge by 2.5cm!)
      const bumperX = -side * (leafW * 0.5 - 0.075);
      const trimMesh = buildBatchedBoxesMesh(
        [
          { w: 0.12, h: leafH - 0.1, d: doorThick + 0.052, x: bumperX, y: leafH * 0.5 + 0.01, z: 0 },
          { w: 0.06, h: 0.62, d: doorThick + 0.09, x: bumperX + side * 0.2, y: 1.4, z: 0 },
        ],
        mats.brushedMetal,
        { name: `${id}_LeafTrim_${side > 0 ? 'R' : 'L'}` }
      );
      if (trimMesh) leaf.add(trimMesh);

      // Glowing meeting-seam strip visible on both sides (centered cleanly inside bumper cap, >= 1.5cm clear of all faces!)
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, leafH * 0.68, doorThick + 0.078),
        statusMat
      );
      seam.name = `${id}_LeafSeam_${side > 0 ? 'R' : 'L'}`;
      seam.position.set(-side * (leafW * 0.5 - 0.045), leafH * 0.5 + 0.01, 0);
      leaf.add(seam);

      return leaf;
    };

    const leftLeaf = buildLeaf(-1);
    const rightLeaf = buildLeaf(1);
    root.add(leftLeaf, rightLeaf);

    const rig: TacticalDoorRig = {
      id,
      mode,
      root,
      position: { x, y, z },
      width,
      height,
      spanAxis,
      triggerDistance,
      closeDistance,
      jammedClearance,
      openRatio: 0,
      targetRatio: 0,
      jamTriggered: false,
      jamShakeTimer: 0,
      collider,
      raycastMeshes,
      applyVisuals: () => {
        const eased = smoothstep01(rig.openRatio);
        // Telescope sliding leaves cleanly inside doorway pocket so open doors NEVER poke into adjacent walls/glass!
        const innerEdge = 0.01 + eased * slideDist;
        const pocketLimitX = clearW * 0.5 + 0.03;
        const outerEdge = Math.min(innerEdge + leafW, pocketLimitX);
        const scaleX = Math.max(0.06, (outerEdge - innerEdge) / leafW);
        const centerX = innerEdge + (leafW * scaleX) * 0.5;
        leftLeaf.scale.x = scaleX;
        rightLeaf.scale.x = scaleX;
        leftLeaf.position.x = -centerX;
        rightLeaf.position.x = centerX;

        // Smoothly shift status beacons from Amber (closed) to Cyan (opening/open)
        const activeOpen = rig.targetRatio > 0.5 || rig.openRatio > 0.35;
        statusMat.color.setHex(activeOpen ? 0x22d3ee : 0xf59e0b);
        statusMat.emissive.setHex(activeOpen ? 0x06b6d4 : 0xd97706);
        statusMat.emissiveIntensity = activeOpen ? 2.1 : 1.3;

        // Dynamic collider clears once leaves are ~70% parted (never instant pop-open!)
        collider.active = rig.openRatio < 0.7;
      },
    };

    rig.applyVisuals(0);
    collector.wallMeshes.push(...raycastMeshes);
    collector.tacticalDoors?.push(rig);
    return rig;
  }

  // --- MODE: 'jammed_roll' — Heavy Vertical Overhead Armored Blast Shutter ---
  const shutterW = clearW - 0.06;
  const maxBodyH = clearH - 0.04;

  const warnMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 2.0,
    roughness: 0.25,
    metalness: 0.2,
  });

  // Heavy industrial overhead roller drum housing & cleanly butt-jointed vertical side guide tracks
  const shutterSideH = clearH - 0.18;
  const frameMesh = buildBatchedBoxesMesh(
    [
      { w: clearW + 0.24, h: 0.34, d: 0.56, x: 0, y: clearH + 0.02, z: 0 },
      { w: 0.11, h: shutterSideH, d: 0.38, x: -(clearW * 0.5 - 0.01), y: 0.014 + shutterSideH * 0.5, z: 0 },
      { w: 0.11, h: shutterSideH, d: 0.38, x: clearW * 0.5 - 0.01, y: 0.014 + shutterSideH * 0.5, z: 0 },
    ],
    mats.structuralSteel,
    { castShadow: true, receiveShadow: true, name: `${id}_ShutterTracks` }
  );
  if (frameMesh) root.add(frameMesh);

  // Dual flickering malfunction warning beacons mounted left & right on overhead shutter drum
  const beaconL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.62), warnMat);
  beaconL.position.set(-clearW * 0.32, clearH + 0.02, 0);
  const beaconR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.62), warnMat);
  beaconR.position.set(clearW * 0.32, clearH + 0.02, 0);
  root.add(beaconL, beaconR);

  // Dynamic scalable upper shutter leaf (so top stays anchored cleanly inside the overhead drum — ZERO ceiling poke-through!)
  const shutterPanel = new THREE.Mesh(
    new THREE.BoxGeometry(shutterW, 1.0, doorThick),
    mats.armoredSteel
  );
  shutterPanel.castShadow = true;
  shutterPanel.receiveShadow = true;
  root.add(shutterPanel);
  raycastMeshes.push(shutterPanel);

  // Rigid armored bottom lip assembly (travels vertically with the shutter bottom edge!)
  const bottomLip = new THREE.Group();
  const lipSpecs: BoxSpec[] = [
    // Heavy steel bottom crossbar beam
    { w: shutterW + 0.02, h: 0.24, d: doorThick + 0.08, x: 0, y: 0.12, z: 0 },
    // Secondary upper armor reinforcement bar
    { w: shutterW - 0.08, h: 0.14, d: doorThick + 0.06, x: 0, y: 0.58, z: 0 },
    { w: shutterW - 0.08, h: 0.14, d: doorThick + 0.06, x: 0, y: 1.06, z: 0 },
  ];
  const lipSteel = buildBatchedBoxesMesh(lipSpecs, mats.structuralSteel, {
    castShadow: true,
    receiveShadow: true,
    name: `${id}_ShutterLipSteel`,
  });
  if (lipSteel) {
    bottomLip.add(lipSteel);
    raycastMeshes.push(lipSteel);
  }
  // Unmistakable diagonal black/yellow hazard chevron bumper along the bottom clearance edge!
  const hazardLip = buildBatchedBoxesMesh(
    [{ w: shutterW - 0.06, h: 0.18, d: doorThick + 0.1, x: 0, y: 0.12, z: 0 }],
    mats.hazardStripe,
    { name: `${id}_ShutterHazardEdge` }
  );
  if (hazardLip) bottomLip.add(hazardLip);

  // Subtle floor warning stripe directly under the jammed shutter threshold (cleanly above 0.008m floor accents!)
  const floorStrip = buildBatchedBoxesMesh(
    [{ w: clearW - 0.14, h: 0.014, d: 0.44, x: 0, y: 0.02, z: 0 }],
    mats.hazardStripe,
    { name: `${id}_JammedFloorStrip` }
  );
  if (floorStrip) root.add(floorStrip);

  root.add(bottomLip);

  const rig: TacticalDoorRig = {
    id,
    mode,
    root,
    position: { x, y, z },
    width,
    height,
    spanAxis,
    triggerDistance,
    closeDistance,
    jammedClearance,
    openRatio: 0,
    targetRatio: 0,
    jamTriggered: false,
    jamShakeTimer: 0,
    collider,
    raycastMeshes,
    applyVisuals: (elapsed: number) => {
      const eased = smoothstep01(rig.openRatio);
      // Damped metallic shudder bounce when the jammed shutter slams into its mechanical limit!
      const shake =
        rig.jamShakeTimer > 0 && rig.jamShakeTimer < 0.55
          ? Math.sin(rig.jamShakeTimer * 44) * Math.exp(-rig.jamShakeTimer * 8.5) * 0.055
          : 0;

      const currentGap = Math.max(
        0.1,
        Math.min(jammedClearance + 0.04, JAM_REST_GAP + eased * (jammedClearance - JAM_REST_GAP) + shake)
      );

      // Anchor shutter top cleanly inside overhead roller drum & bottom 6cm inside bottomLip (zero Y Z-fighting!)
      const panelBottom = currentGap + 0.06;
      const panelH = Math.max(0.22, maxBodyH - panelBottom);
      shutterPanel.scale.y = panelH;
      shutterPanel.position.set(0, panelBottom + panelH * 0.5, 0);
      bottomLip.position.set(0, currentGap, 0);

      // Flickering amber/crimson malfunction warning beacons!
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 9.5 + (rig.jamTriggered ? 0 : 1.2));
      const stutter = rig.jamTriggered && Math.sin(elapsed * 37) > 0.72 ? 0.35 : 1.0;
      warnMat.color.setHex(rig.jamTriggered ? 0xef4444 : 0xf97316);
      warnMat.emissive.setHex(rig.jamTriggered ? 0xdc2626 : 0xea580c);
      warnMat.emissiveIntensity = (1.1 + pulse * 1.45) * stutter;

      // Real-time stance-aware collider:
      // Standing (1.75m) & Crouching (1.28m) ALWAYS exceed `baseY + currentGap` (max 1.16m) -> BLOCKED!
      // Dodge-Rolling (0.84m) stays strictly below `baseY + 1.16m` -> PASSES CLEANLY UNDERNEATH!
      collider.active = true;
      collider.minY = y + currentGap;
      collider.maxY = y + height;
    },
  };

  rig.applyVisuals(0);
  collector.wallMeshes.push(...raycastMeshes);
  collector.tacticalDoors?.push(rig);
  return rig;
}

/**
 * Pure simulation step for all active tactical doors (zero per-frame allocations when idle!).
 * Returns any newly triggered mechanical audio events for this tick.
 */
export function stepTacticalDoors(
  doors: TacticalDoorRig[] | undefined,
  dt: number,
  elapsed: number,
  px: number,
  py: number,
  pz: number
): TacticalDoorEvent[] {
  const events: TacticalDoorEvent[] = [];
  if (!doors || doors.length === 0) return events;

  for (let i = 0; i < doors.length; i++) {
    const d = doors[i];
    const dy = Math.abs(py - d.position.y);
    const dist = Math.hypot(px - d.position.x, pz - d.position.z);

    const prevTarget = d.targetRatio;
    if (dy < 2.2 && dist <= d.triggerDistance) {
      d.targetRatio = 1;
    } else if (dy >= 2.6 || dist >= d.closeDistance) {
      d.targetRatio = 0;
    }

    if (prevTarget < 0.5 && d.targetRatio >= 0.5) {
      d.jamTriggered = false;
      d.jamShakeTimer = 0;
      events.push({ kind: 'slide_open', doorId: d.id });
    } else if (prevTarget >= 0.5 && d.targetRatio < 0.5) {
      d.jamTriggered = false;
      events.push({ kind: 'slide_close', doorId: d.id });
    }

    const openDur = d.mode === 'jammed_roll' ? JAM_OPEN_DURATION : AUTO_OPEN_DURATION;
    const closeDur = d.mode === 'jammed_roll' ? JAM_CLOSE_DURATION : AUTO_CLOSE_DURATION;

    if (d.targetRatio > d.openRatio) {
      d.openRatio = Math.min(d.targetRatio, d.openRatio + dt / openDur);
      if (d.mode === 'jammed_roll' && d.openRatio >= 0.999 && !d.jamTriggered) {
        d.jamTriggered = true;
        d.jamShakeTimer = 0.001;
        events.push({ kind: 'jam_clunk', doorId: d.id });
      }
    } else if (d.targetRatio < d.openRatio) {
      d.openRatio = Math.max(d.targetRatio, d.openRatio - dt / closeDur);
    }

    if (d.jamShakeTimer > 0 && d.jamShakeTimer < 0.6) {
      d.jamShakeTimer += dt;
    }

    d.applyVisuals(elapsed);
  }

  return events;
}

export function resetTacticalDoors(doors: TacticalDoorRig[] | undefined): void {
  if (!doors) return;
  for (let i = 0; i < doors.length; i++) {
    const d = doors[i];
    d.openRatio = 0;
    d.targetRatio = 0;
    d.jamTriggered = false;
    d.jamShakeTimer = 0;
    d.applyVisuals(0);
  }
}
