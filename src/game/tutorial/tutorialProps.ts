import * as THREE from 'three';
import { createBeveledBox } from '../core/sculptUtils';
import type { Floor08TutorialSignals, Floor08TutorialStepId } from './floor08Tutorial';

type StationVisualState = 'upcoming' | 'active' | 'done';

interface HoloSignHandle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  lastKey: string;
  render: (
    stepNum: string,
    title: string,
    keys: string[],
    subtitle: string,
    state: StationVisualState
  ) => void;
}

function createHoloSign(width: number, height: number): HoloSignHandle {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = Math.round((640 * height) / width);
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);

  const handle: HoloSignHandle = {
    mesh,
    mat,
    canvas,
    ctx,
    texture,
    lastKey: '',
    render(stepNum, title, keys, subtitle, state) {
      const cacheKey = `${stepNum}|${title}|${keys.join(',')}|${subtitle}|${state}`;
      if (cacheKey === handle.lastKey) return;
      handle.lastKey = cacheKey;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const accent =
        state === 'done' ? '#34d399' : state === 'active' ? '#fbbf24' : '#38bdf8';
      const borderAlpha = state === 'active' ? 0.95 : state === 'done' ? 0.85 : 0.55;
      const bgAlpha = state === 'active' ? 0.86 : 0.72;

      // Dark angled tactical holo backing
      ctx.fillStyle = `rgba(6, 12, 22, ${bgAlpha})`;
      ctx.beginPath();
      const cut = 22;
      ctx.moveTo(cut, 6);
      ctx.lineTo(w - 6, 6);
      ctx.lineTo(w - 6, h - cut);
      ctx.lineTo(w - cut, h - 6);
      ctx.lineTo(6, h - 6);
      ctx.lineTo(6, cut);
      ctx.closePath();
      ctx.fill();

      // Subtle scanlines
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (let y = 12; y < h - 10; y += 8) {
        ctx.fillRect(10, y, w - 20, 2);
      }

      // Outer glowing frame
      ctx.strokeStyle = accent;
      ctx.globalAlpha = borderAlpha;
      ctx.lineWidth = state === 'active' ? 5 : 3;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Top-left header bar
      ctx.fillStyle = accent;
      ctx.fillRect(18, 18, 12, 34);
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      ctx.fillStyle = accent;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(stepNum, 40, 35);

      ctx.font = 'bold 30px "Rajdhani", "Orbitron", sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(title, 132, 35);

      // Right status tag
      if (state === 'done') {
        ctx.font = 'bold 24px "JetBrains Mono", monospace';
        ctx.fillStyle = '#34d399';
        ctx.textAlign = 'right';
        ctx.fillText('✓ COMPLETE', w - 24, 35);
      } else if (state === 'active') {
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'right';
        ctx.fillText('● ACTIVE', w - 24, 35);
      }

      // Crisp 3D-style keycap badges centered in middle band
      const keyY = Math.round(h * 0.54);
      ctx.font = 'bold 34px "JetBrains Mono", monospace';
      const padX = 22;
      const gap = 16;
      const widths = keys.map((k) => Math.max(66, ctx.measureText(k).width + padX * 2));
      const totalW = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, keys.length - 1);
      let cursorX = (w - totalW) * 0.5;
      const capH = 56;

      for (let i = 0; i < keys.length; i++) {
        const kw = widths[i];
        const kx = cursorX;
        const ky = keyY - capH * 0.5;

        // Keycap bevel shadow
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(kx + 3, ky + 5, kw, capH);

        // Keycap body
        ctx.fillStyle = state === 'active' ? 'rgba(251,191,36,0.22)' : 'rgba(15,23,42,0.92)';
        ctx.fillRect(kx, ky, kw, capH);

        // Keycap border
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(kx, ky, kw, capH);

        // Keycap label
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(keys[i], kx + kw * 0.5, keyY + 2);

        cursorX += kw + gap;
      }

      // Bottom action line
      ctx.font = '600 22px "JetBrains Mono", monospace';
      ctx.fillStyle = state === 'done' ? '#a7f3d0' : '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(subtitle, w * 0.5, h - 28);

      texture.needsUpdate = true;
    },
  };

  return handle;
}

/**
 * 100% Diegetic In-World Floor 08 Tactical Training Gauntlet.
 *
 * Replaces floating HUD instruction overlays with bold 3D holographic keycap gantries,
 * animated floor guidance chevrons, a physical dark-steel combat calibration dummy,
 * laser vault hurdle, low dodge-roll laser shutter arch, shootable amber breach relay,
 * `[E]` combat arming pedestal, and an entry-gate `[TAB]` Skip Terminal.
 *
 * Kept dynamic outside Floor 08 static wall batches so Hideout Tests 26 & 27 remain 100% clean,
 * and vanishes cleanly the moment Live Combat activates!
 */
export class Floor08TutorialProps {
  public readonly group = new THREE.Group();
  public readonly relayHitbox: THREE.Mesh;
  public readonly dummyHitbox: THREE.Mesh;
  public relayDestroyed = false;

  private readonly station1ArchMat: THREE.MeshBasicMaterial;
  private readonly station4JumpLaserMat: THREE.MeshBasicMaterial;
  private readonly station4RollLaserMat: THREE.MeshBasicMaterial;
  private readonly relayGroup = new THREE.Group();
  private readonly relayCoreMat: THREE.MeshStandardMaterial;
  private readonly relayRingMat: THREE.MeshBasicMaterial;
  private readonly relayGuideRing: THREE.Mesh;
  private readonly relayCore: THREE.Mesh;

  private readonly dummyPivot = new THREE.Group();
  private readonly dummySensorMat: THREE.MeshStandardMaterial;
  private dummyRecoilAngle = 0;

  private readonly armingBeaconMat: THREE.MeshStandardMaterial;
  private readonly armingRing: THREE.Mesh;
  private readonly armingPos = new THREE.Vector3(-1.55, 98.0, 13.0);

  private readonly chevronMats: THREE.MeshBasicMaterial[] = [];
  private readonly signs: {
    skip: HoloSignHandle;
    s1Move: HoloSignHandle;
    s2Combat: HoloSignHandle;
    s3Reload: HoloSignHandle;
    s4Jump: HoloSignHandle;
    s4Roll: HoloSignHandle;
    s5Breach: HoloSignHandle;
  };
  private readonly disposables: Array<{ dispose: () => void }> = [];

  constructor() {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e2530,
      roughness: 0.72,
      metalness: 0.58,
    });
    const darkCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x141922,
      roughness: 0.82,
      metalness: 0.35,
    });
    const hazardAmberMat = new THREE.MeshStandardMaterial({
      color: 0xd98a18,
      roughness: 0.65,
      metalness: 0.25,
    });
    this.disposables.push(steelMat, darkCarbonMat, hazardAmberMat);

    const floorY = 98.0;

    // -------------------------------------------------------------------------
    // 0. FLOOR GUIDANCE CHEVRON CARPET (Entry Gate z=42.8 -> Station 5 z=13.6)
    // -------------------------------------------------------------------------
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(0, 0.44);
    chevronShape.lineTo(0.72, -0.18);
    chevronShape.lineTo(0.46, -0.34);
    chevronShape.lineTo(0, 0.06);
    chevronShape.lineTo(-0.46, -0.34);
    chevronShape.lineTo(-0.72, -0.18);
    chevronShape.closePath();
    const chevronGeo = new THREE.ShapeGeometry(chevronShape);
    chevronGeo.rotateX(-Math.PI / 2);
    this.disposables.push(chevronGeo);

    for (let z = 42.6; z >= 13.8; z -= 2.4) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.chevronMats.push(mat);
      this.disposables.push(mat);
      const mesh = new THREE.Mesh(chevronGeo, mat);
      mesh.position.set(0, floorY + 0.028, z);
      this.group.add(mesh);
    }

    // -------------------------------------------------------------------------
    // ENTRY SKIP TERMINAL (Left of Entry Spawn: x=-2.35, z=39.2 — fully framed at spawn!)
    // -------------------------------------------------------------------------
    const skipGroup = new THREE.Group();
    skipGroup.position.set(-2.35, floorY, 39.2);
    skipGroup.rotation.y = 0.54;
    this.group.add(skipGroup);

    const skipBase = new THREE.Mesh(createBeveledBox(0.52, 0.98, 0.34, 0.02), steelMat);
    skipBase.position.y = 0.49;
    skipGroup.add(skipBase);

    const skipSign = createHoloSign(1.65, 0.78);
    skipSign.mesh.position.set(0, 1.5, 0.06);
    skipSign.render('SKIP', 'LIVE COMBAT', ['TAB'], 'JUMP STRAIGHT INTO FLOOR 08', 'upcoming');
    skipGroup.add(skipSign.mesh);

    // -------------------------------------------------------------------------
    // STATION 1: SPRINT GATE ARCH (z = 38.6 — right in front of Entry Gate!)
    // -------------------------------------------------------------------------
    const s1Group = new THREE.Group();
    s1Group.position.set(0, floorY, 38.6);
    this.group.add(s1Group);

    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(createBeveledBox(0.24, 2.95, 0.28, 0.02), steelMat);
      pylon.position.set(side * 2.25, 1.475, 0);
      s1Group.add(pylon);

      const foot = new THREE.Mesh(createBeveledBox(0.46, 0.14, 0.52, 0.015), hazardAmberMat);
      foot.position.set(side * 2.25, 0.07, 0);
      s1Group.add(foot);
    }

    this.station1ArchMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.78,
    });
    this.disposables.push(this.station1ArchMat);
    const s1Beam = new THREE.Mesh(new THREE.BoxGeometry(4.36, 0.08, 0.08), this.station1ArchMat);
    s1Beam.position.set(0, 2.92, 0);
    s1Group.add(s1Beam);

    const s1Move = createHoloSign(2.75, 1.05);
    s1Move.mesh.position.set(0, 2.38, 0);
    s1Group.add(s1Move.mesh);

    // -------------------------------------------------------------------------
    // STATION 2: WEAPON AIM / SWAP / FIRE GANTRY (z = 30.2) + DARK-STEEL DUMMY (z = 21.6)
    // -------------------------------------------------------------------------
    const s2Group = new THREE.Group();
    s2Group.position.set(0, floorY, 30.2);
    this.group.add(s2Group);

    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.95, 8), steelMat);
      pole.position.set(side * 2.15, 1.475, 0);
      s2Group.add(pole);
    }
    const s2Combat = createHoloSign(3.1, 1.12);
    s2Combat.mesh.position.set(0, 2.52, 0);
    s2Group.add(s2Combat.mesh);

    // Physical Dark-Steel Armored Calibration Dummy (NOT a blue target!) at (0, 98.0, 21.6)
    const dummyBaseGroup = new THREE.Group();
    dummyBaseGroup.position.set(0, floorY, 21.6);
    this.group.add(dummyBaseGroup);

    const dummyPlinth = new THREE.Mesh(createBeveledBox(0.76, 0.14, 0.64, 0.02), steelMat);
    dummyPlinth.position.y = 0.07;
    dummyBaseGroup.add(dummyPlinth);

    this.dummyPivot.position.set(0, 0.14, 0);
    dummyBaseGroup.add(this.dummyPivot);

    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.05, 8), steelMat);
    spine.position.y = 0.52;
    this.dummyPivot.add(spine);

    const torso = new THREE.Mesh(createBeveledBox(0.56, 0.68, 0.18, 0.025), darkCarbonMat);
    torso.position.y = 1.18;
    this.dummyPivot.add(torso);

    const head = new THREE.Mesh(createBeveledBox(0.26, 0.28, 0.16, 0.025), darkCarbonMat);
    head.position.y = 1.68;
    this.dummyPivot.add(head);

    this.dummySensorMat = new THREE.MeshStandardMaterial({
      color: 0xff6b2b,
      emissive: 0xff4514,
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.2,
    });
    this.disposables.push(this.dummySensorMat);

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.05), this.dummySensorMat);
    chestPlate.position.set(0, 1.22, 0.1);
    this.dummyPivot.add(chestPlate);

    const visorBand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), this.dummySensorMat);
    visorBand.position.set(0, 1.7, 0.09);
    this.dummyPivot.add(visorBand);

    this.dummyHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 1.15, 0.36),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.dummyHitbox.position.set(0, 1.32, 0);
    this.dummyHitbox.userData = { tutorialDummyId: 'f8_calibration_dummy' };
    this.dummyPivot.add(this.dummyHitbox);

    // -------------------------------------------------------------------------
    // STATION 3: ACTIVE RELOAD / CRYO-VENT OVERHEAD GANTRY (Centered cleanly in Lane 03: z=25.4)
    // -------------------------------------------------------------------------
    const s3Group = new THREE.Group();
    s3Group.position.set(0, floorY, 25.4);
    this.group.add(s3Group);

    for (const side of [-1, 1]) {
      const s3Pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.068, 2.85, 8), steelMat);
      s3Pole.position.set(side * 1.48, 1.425, 0);
      s3Group.add(s3Pole);
    }

    const s3Reload = createHoloSign(2.45, 0.9);
    s3Reload.mesh.position.set(0, 2.52, 0);
    s3Group.add(s3Reload.mesh);

    // -------------------------------------------------------------------------
    // STATION 4A: VAULT LASER HURDLE (z = 18.8 — JUMP OVER with [SPACE])
    // -------------------------------------------------------------------------
    const s4JumpGroup = new THREE.Group();
    s4JumpGroup.position.set(0, floorY, 18.8);
    this.group.add(s4JumpGroup);

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(createBeveledBox(0.2, 0.95, 0.24, 0.015), steelMat);
      post.position.set(side * 1.48, 0.475, 0);
      s4JumpGroup.add(post);
    }
    this.station4JumpLaserMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
    });
    this.disposables.push(this.station4JumpLaserMat);
    for (const h of [0.35, 0.65]) {
      const laser = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 2.86, 8),
        this.station4JumpLaserMat
      );
      laser.rotation.z = Math.PI / 2;
      laser.position.set(0, h, 0);
      s4JumpGroup.add(laser);
    }
    const s4Jump = createHoloSign(1.88, 0.78);
    s4Jump.mesh.position.set(-1.74, 1.56, 0);
    s4Jump.mesh.rotation.y = 0.28;
    s4JumpGroup.add(s4Jump.mesh);

    // -------------------------------------------------------------------------
    // STATION 4B: LOW LASER DODGE-ROLL SHUTTER ARCH (z = 15.6 — ROLL UNDER with [V])
    // -------------------------------------------------------------------------
    const s4RollGroup = new THREE.Group();
    s4RollGroup.position.set(0, floorY, 15.6);
    this.group.add(s4RollGroup);

    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(createBeveledBox(0.22, 2.55, 0.28, 0.02), steelMat);
      jamb.position.set(side * 1.52, 1.275, 0);
      s4RollGroup.add(jamb);
    }
    const topShutter = new THREE.Mesh(createBeveledBox(3.15, 0.65, 0.22, 0.02), darkCarbonMat);
    topShutter.position.set(0, 2.22, 0);
    s4RollGroup.add(topShutter);

    this.station4RollLaserMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.78,
    });
    this.disposables.push(this.station4RollLaserMat);
    for (const h of [1.22, 1.52, 1.82]) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, 2.9, 8),
        this.station4RollLaserMat
      );
      beam.rotation.z = Math.PI / 2;
      beam.position.set(0, h, 0);
      s4RollGroup.add(beam);
    }
    const s4Roll = createHoloSign(2.25, 0.9);
    s4Roll.mesh.position.set(0, 2.38, 0.16);
    s4RollGroup.add(s4Roll.mesh);

    // -------------------------------------------------------------------------
    // STATION 5: BREACH RELAY (z = 12.2) + [E] COMBAT ARMING PEDESTAL (-1.55, z = 13.0)
    // -------------------------------------------------------------------------
    this.relayGroup.position.set(0, floorY, 12.2);
    this.group.add(this.relayGroup);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 1.52, 10), steelMat);
    post.position.y = 0.76;
    this.relayGroup.add(post);

    const pedestal = new THREE.Mesh(createBeveledBox(0.54, 0.14, 0.54, 0.015), steelMat);
    pedestal.position.y = 0.07;
    this.relayGroup.add(pedestal);

    const shroud = new THREE.Mesh(createBeveledBox(0.48, 0.48, 0.22, 0.02), darkCarbonMat);
    shroud.position.y = 1.66;
    this.relayGroup.add(shroud);

    this.relayCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffb824,
      emissive: 0xff9a14,
      emissiveIntensity: 2.8,
      roughness: 0.22,
      metalness: 0.2,
    });
    this.disposables.push(this.relayCoreMat);
    this.relayCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.relayCoreMat);
    this.relayCore.position.set(0, 1.66, 0.07);
    this.relayGroup.add(this.relayCore);

    this.relayRingMat = new THREE.MeshBasicMaterial({
      color: 0xffb824,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.disposables.push(this.relayRingMat);
    const ringGeo = new THREE.RingGeometry(0.58, 0.76, 28);
    ringGeo.rotateX(-Math.PI / 2);
    this.disposables.push(ringGeo);
    this.relayGuideRing = new THREE.Mesh(ringGeo, this.relayRingMat);
    this.relayGuideRing.position.y = 0.04;
    this.relayGroup.add(this.relayGuideRing);

    this.relayHitbox = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.relayHitbox.position.set(0, 1.66, 0.04);
    this.relayHitbox.userData = { tutorialRelayId: 'f8_tutorial_breach_relay' };
    this.relayGroup.add(this.relayHitbox);

    const s5Breach = createHoloSign(3.1, 1.08);
    s5Breach.mesh.position.set(0, 2.72, 0);
    this.relayGroup.add(s5Breach.mesh);

    // Flanking [E] Tactical Combat Arming Pedestal
    const armingGroup = new THREE.Group();
    armingGroup.position.copy(this.armingPos);
    armingGroup.rotation.y = 0.35;
    this.group.add(armingGroup);

    const armBody = new THREE.Mesh(createBeveledBox(0.42, 1.12, 0.32, 0.02), steelMat);
    armBody.position.y = 0.56;
    armingGroup.add(armBody);

    this.armingBeaconMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.2,
      roughness: 0.28,
      metalness: 0.2,
    });
    this.disposables.push(this.armingBeaconMat);
    const armScreen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.04), this.armingBeaconMat);
    armScreen.position.set(0, 1.16, 0.04);
    armScreen.rotation.x = -0.35;
    armingGroup.add(armScreen);

    this.armingRing = new THREE.Mesh(ringGeo, this.relayRingMat);
    this.armingRing.position.y = 0.04;
    this.armingRing.scale.setScalar(0.85);
    armingGroup.add(this.armingRing);

    this.signs = {
      skip: skipSign,
      s1Move,
      s2Combat,
      s3Reload,
      s4Jump,
      s4Roll,
      s5Breach,
    };

    // Initial render of all diegetic billboards
    this.refreshSignStates('move_sprint');
  }

  public setActive(visible: boolean): void {
    this.group.visible = visible;
    if (visible) {
      this.relayDestroyed = false;
      this.relayGroup.visible = true;
      this.dummyRecoilAngle = 0;
    }
  }

  public triggerDummyHit(): THREE.Vector3 {
    this.dummyRecoilAngle = -0.48;
    return new THREE.Vector3(0, 99.32, 21.6);
  }

  public destroyRelay(): THREE.Vector3 {
    this.relayDestroyed = true;
    this.relayGroup.visible = false;
    return new THREE.Vector3(0, 99.66, 12.2);
  }

  public isNearArmingPedestal(x: number, y: number, z: number): boolean {
    if (!this.group.visible) return false;
    const dx = x - this.armingPos.x;
    const dz = z - this.armingPos.z;
    return Math.abs(y - this.armingPos.y) < 1.6 && dx * dx + dz * dz <= 2.4 * 2.4;
  }

  public update(
    elapsed: number,
    activeStep: Floor08TutorialStepId = 'move_sprint',
    signals?: Floor08TutorialSignals
  ): void {
    if (!this.group.visible) return;

    this.refreshSignStates(activeStep, signals);

    // Animate floor guidance chevron wave flowing forward down Lane 03
    const activeColorHex = activeStep === 'relay_interact' ? 0xfbbf24 : 0x38bdf8;
    for (let i = 0; i < this.chevronMats.length; i++) {
      const wave = 0.5 + 0.5 * Math.sin(elapsed * 5.2 - i * 0.65);
      this.chevronMats[i].color.setHex(activeColorHex);
      this.chevronMats[i].opacity = 0.2 + wave * 0.62;
    }

    // Spring-back dark-steel calibration dummy
    if (Math.abs(this.dummyRecoilAngle) > 0.002) {
      this.dummyRecoilAngle *= 0.86;
    } else {
      this.dummyRecoilAngle = 0;
    }
    this.dummyPivot.rotation.x = this.dummyRecoilAngle;
    this.dummySensorMat.emissiveIntensity = 1.9 + Math.sin(elapsed * 6.0) * 0.5;

    // Pulse Station 1 & Station 4 laser barriers
    this.station1ArchMat.opacity = 0.58 + Math.sin(elapsed * 5) * 0.22;
    this.station4JumpLaserMat.opacity = 0.65 + Math.sin(elapsed * 8) * 0.25;
    this.station4RollLaserMat.opacity = 0.62 + Math.sin(elapsed * 9.5) * 0.26;

    // Spin & pulse Station 5 Breach Relay + Arming Pedestal
    if (!this.relayDestroyed) {
      this.relayCore.rotation.y = elapsed * 2.3;
      this.relayCore.rotation.x = Math.sin(elapsed * 1.7) * 0.28;
      this.relayCoreMat.emissiveIntensity = 2.4 + Math.sin(elapsed * 7.5) * 0.9;
      const pulse = 1 + Math.sin(elapsed * 5) * 0.09;
      this.relayGuideRing.scale.set(pulse, 1, pulse);
      this.armingRing.scale.set(0.85 * pulse, 1, 0.85 * pulse);
      this.armingBeaconMat.emissiveIntensity = 1.8 + Math.sin(elapsed * 5.5) * 0.65;
    }
  }

  private refreshSignStates(step: Floor08TutorialStepId, signals?: Floor08TutorialSignals): void {
    const order: Floor08TutorialStepId[] = [
      'move_sprint',
      'aim_fire_swap',
      'reload_vent',
      'jump_roll',
      'relay_interact',
      'completed',
    ];
    const curIdx = Math.max(0, order.indexOf(step));
    const stateFor = (idx: number): StationVisualState =>
      curIdx > idx ? 'done' : curIdx === idx ? 'active' : 'upcoming';

    const s1 = stateFor(0);
    this.station1ArchMat.color.setHex(s1 === 'done' ? 0x34d399 : s1 === 'active' ? 0xfbbf24 : 0x38bdf8);
    this.signs.s1Move.render(
      '01',
      'MOVE & SPRINT',
      ['W A S D', 'SHIFT'],
      s1 === 'done' ? 'MOBILITY VERIFIED — ADVANCE TO LANE 03' : 'SPRINT THROUGH THE ARCHWAY',
      s1
    );

    const s2 = stateFor(1);
    const s2Sub =
      s2 === 'done'
        ? 'WEAPONS ONLINE — ADVANCE TO RELOAD STATION'
        : `${signals?.aimedAds ? '✓ ADS' : '○ ADS'} · ${signals?.firedWeapon ? '✓ FIRE' : '○ FIRE'} · ${signals?.swappedWeapon ? '✓ SWAP' : '○ SWAP'}`;
    this.signs.s2Combat.render(
      '02',
      'AIM · FIRE · WEAPON SWAP',
      ['RMB', 'LMB', '1', '2', '3'],
      s2Sub,
      s2
    );

    const s3 = stateFor(2);
    this.signs.s3Reload.render(
      '03',
      'ACTIVE RELOAD / VENT',
      ['R'],
      s3 === 'done' ? 'RELOAD SYNCED — PROCEED TO HURDLE' : 'TAP [R] TO RELOAD OR VENT HEAT',
      s3
    );

    const s4 = stateFor(3);
    const jumpState: StationVisualState =
      s4 === 'done' || signals?.jumped ? 'done' : s4;
    const rollState: StationVisualState =
      s4 === 'done' || signals?.dodgeRolled ? 'done' : s4;
    this.station4JumpLaserMat.color.setHex(jumpState === 'done' ? 0x34d399 : 0xfbbf24);
    this.station4RollLaserMat.color.setHex(rollState === 'done' ? 0x34d399 : 0xf43f5e);

    this.signs.s4Jump.render(
      '04A',
      'VAULT HURDLE',
      ['SPACE'],
      jumpState === 'done' ? 'JUMP CLEARED' : 'JUMP OVER LASER BAR',
      jumpState
    );
    this.signs.s4Roll.render(
      '04B',
      'LOW SHUTTER ROLL',
      ['V'],
      rollState === 'done' ? 'DODGE-ROLL CLEARED' : 'DODGE-ROLL UNDER LASER SHUTTER',
      rollState
    );

    const s5 = stateFor(4);
    this.signs.s5Breach.render(
      '05',
      'ARM FLOOR 08 COMBAT',
      ['SHOOT RELAY', 'E'],
      s5 === 'done'
        ? 'LIVE COMBAT ENGAGED'
        : 'DESTROY AMBER CORE OR PRESS [E] AT PEDESTAL',
      s5
    );
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
    for (const s of Object.values(this.signs)) {
      s.texture.dispose();
      s.mat.dispose();
      s.mesh.geometry.dispose();
    }
  }
}
