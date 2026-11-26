import * as THREE from 'three';
import {
  createBeveledBox,
  createCurvedPanelGeometry,
  createLoftedAnatomy,
} from '../../../core/sculptUtils';
import { createEnemyHitboxMesh } from '../../core/enemyMeshShared';
import type { EnemyAnimationInput, EnemyRigHandle } from '../../core/types';
import type { Floor07EnemyMaterials } from '../materials';
import {
  createValkyrieDroneTextures,
  type ValkyrieDroneTextureSuite,
} from './textures';

export interface ValkyrieDroneRigHandle extends EnemyRigHandle {
  setRailBeam: (active: boolean, length: number, chargeRatio: number) => void;
  getGunMuzzleWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  getRocketPodWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  getThrusterExhaustWorldPos: (side: -1 | 1, out: THREE.Vector3) => THREE.Vector3;
  triggerGunRecoil: (side: -1 | 1) => void;
}

/**
 * AAA Sculpted Rig for Floor 07 Enemy #4: VALKYRIE HOVER-DRONE
 * - Predatory autonomous VTOL Hunter-Killer Gunship in satin pearl-titanium & graphite stealth
 *   aerospace composite with vermilion air-interceptor striping, 2x2 twill carbon-fiber ribs,
 *   and heat-blued turbine titanium shrouds.
 * - Aerodynamic lofted gunship fuselage with chined stealth flank cowlings, dorsal avionics hump,
 *   swept twin V-tail stabilizers, and rear auxiliary afterburner.
 * - Central Optic Gyro-Core Weakpoint (`optic_gyro_core`) recessed in the armored nose prow with
 *   4 articulated predatory iris shutter petals, spinning gyro gimbal ring, and live wall-clipped
 *   Rail-Laser Scanner Beam (`setRailBeam`).
 * - Twin articulated tilt-rotor VTOL ducted fan nacelles with 6-blade high-speed composite rotors,
 *   vermilion winglets, port/starboard nav strobes, thrust-vectoring petals, and cyan plasma plumes.
 * - 2-axis gimbaled twin-barrel chin pulse autocannon (alternating barrel recoil!) + dual 4-tube
 *   under-wing micro-rocket pods with glowing warhead tips.
 */
export function buildValkyrieHoverDroneRig(
  enemyId: string,
  _mats: Floor07EnemyMaterials,
  sharedTextures?: ValkyrieDroneTextureSuite
): ValkyrieDroneRigHandle {
  const tex = sharedTextures ?? createValkyrieDroneTextures();
  const ownsTextures = !sharedTextures;

  const root = new THREE.Group();
  const disposedGeos: THREE.BufferGeometry[] = [];
  const disposedMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposedMats.push(m);
    return m;
  };

  // High-key PBR materials (color: 0xffffff so full-hue procedural textures never darken!)
  const hullMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.hullAlbedo,
      bumpMap: tex.hullBump,
      bumpScale: 0.018,
      roughnessMap: tex.hullRoughness,
      roughness: 0.72,
      metalness: 0.34,
    })
  );

  const carbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.carbonAlbedo,
      bumpMap: tex.carbonBump,
      bumpScale: 0.016,
      roughness: 0.56,
      metalness: 0.35,
    })
  );

  const jetMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.jetMetalAlbedo,
      bumpMap: tex.jetMetalBump,
      bumpScale: 0.016,
      roughness: 0.36,
      metalness: 0.82,
    })
  );

  const vermilionMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe64a22,
      bumpMap: tex.hullBump,
      bumpScale: 0.01,
      roughness: 0.44,
      metalness: 0.24,
    })
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4dce6,
      roughness: 0.22,
      metalness: 0.92,
    })
  );

  const weakpointMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.opticCoreMap,
      emissive: 0x26dcff,
      emissiveMap: tex.opticCoreMap,
      emissiveIntensity: 1.15,
      roughness: 0.12,
      metalness: 0.28,
    })
  );

  const rocketTipMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff8a24,
      emissive: 0xff5a12,
      emissiveIntensity: 1.65,
      roughness: 0.3,
      metalness: 0.3,
    })
  );

  const plasmaRailMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x38eeff })
  );

  const portStrobeMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xff2b38 })
  );
  const starboardStrobeMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x2cff9c })
  );

  // Soft vertical alpha-gradient Mach-diamond ion plumes (zero harsh opaque triangles!)
  const plumeOuterMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x28e2ff,
      map: tex.plumeGradMap,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );

  const plumeCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xdcfcff,
      map: tex.plumeGradMap,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );

  const diffuserGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x48f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const rotorBlurMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x6ce8ff,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const beamCoreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xd8fcff,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const beamHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x14d8ff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );

  const reg = (m: THREE.Mesh): THREE.Mesh => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // Child chassis group (NEVER mutate root.position/rotation — owned by EnemyManager!)
  const chassis = new THREE.Group();
  chassis.position.set(0, 0.66, 0);
  root.add(chassis);

  // =========================================================================
  // 1. SCULPTED AERODYNAMIC PREDATOR FUSELAGE & STEALTH FAIRINGS
  // =========================================================================
  // Strictly increasing y from -0.58 (nose) to +0.68 (tail), rotated +PI/2 around X -> maps to -Z..+Z!
  const fuselageGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.56, rx: 0.16, rz: 0.135, squareness: 2.3 },
        { y: -0.44, rx: 0.265, rz: 0.195, squareness: 2.55 },
        { y: -0.22, rx: 0.34, rz: 0.235, squareness: 2.7 },
        { y: 0.04, rx: 0.35, rz: 0.225, squareness: 2.65 },
        { y: 0.3, rx: 0.275, rz: 0.18, squareness: 2.5 },
        { y: 0.52, rx: 0.17, rz: 0.125, squareness: 2.3 },
        { y: 0.66, rx: 0.1, rz: 0.09, squareness: 2.1 },
      ],
      24
    )
  );
  fuselageGeo.rotateX(Math.PI * 0.5);
  const fuselageMesh = reg(new THREE.Mesh(fuselageGeo, hullMat));
  chassis.add(fuselageMesh);

  // Dorsal sculpted stealth avionics spine cowling running nose-to-tail
  const dorsalCowlingGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.44, rx: 0.12, rz: 0.06, squareness: 2.4 },
        { y: -0.18, rx: 0.22, rz: 0.115, squareness: 2.65 },
        { y: 0.12, rx: 0.24, rz: 0.125, squareness: 2.6 },
        { y: 0.42, rx: 0.145, rz: 0.085, squareness: 2.4 },
        { y: 0.58, rx: 0.07, rz: 0.045, squareness: 2.2 },
      ],
      18
    )
  );
  dorsalCowlingGeo.rotateX(Math.PI * 0.5);
  const dorsalCowling = reg(new THREE.Mesh(dorsalCowlingGeo, carbonMat));
  dorsalCowling.position.set(0, 0.165, 0.04);
  chassis.add(dorsalCowling);

  // Vermilion aerospace dorsal interceptor crest & twin cheek air-intake cowls
  const dorsalCrest = reg(
    new THREE.Mesh(trackGeo(createBeveledBox(0.056, 0.072, 0.62, 0.012)), vermilionMat)
  );
  dorsalCrest.position.set(0, 0.275, 0.06);
  chassis.add(dorsalCrest);

  // Dorsal twin telemetry blade antennas & lofted stealth cheek intakes
  const cheekIntakeGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.22, rx: 0.042, rz: 0.052, squareness: 2.6 },
        { y: -0.06, rx: 0.062, rz: 0.072, squareness: 2.6 },
        { y: 0.12, rx: 0.056, rz: 0.064, squareness: 2.4 },
        { y: 0.24, rx: 0.024, rz: 0.032, squareness: 2.1 },
      ],
      14
    )
  );
  cheekIntakeGeo.rotateX(Math.PI * 0.5);

  for (const side of [-1, 1] as const) {
    const ant = new THREE.Mesh(
      trackGeo(createBeveledBox(0.014, 0.21, 0.055, 0.004)),
      carbonMat
    );
    ant.position.set(side * 0.11, 0.31, 0.24);
    ant.rotation.set(-0.28, 0, -side * 0.18);
    chassis.add(ant);

    // Sculpted lofted stealth radar/intake cheek pods hugging the curved fuselage
    const cheekIntake = reg(new THREE.Mesh(cheekIntakeGeo, hullMat));
    cheekIntake.position.set(side * 0.305, -0.005, -0.17);
    cheekIntake.rotation.y = side * 0.16;
    chassis.add(cheekIntake);

    // Recessed angled splitter intake vane at mouth of each cheek fairing
    const intakeGrille = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.042, 0.046, 0.05, 8)),
      jetMetalMat
    );
    intakeGrille.rotation.x = Math.PI * 0.5;
    intakeGrille.position.set(side * 0.325, -0.005, -0.375);
    intakeGrille.rotation.y = side * 0.16;
    chassis.add(intakeGrille);
  }

  // Tapered ventral keel spine fairing bridging chin turret smoothly into rear turbine nozzle
  const ventralKeelGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.26, rx: 0.11, rz: 0.05, squareness: 2.4 },
        { y: 0.06, rx: 0.14, rz: 0.068, squareness: 2.5 },
        { y: 0.36, rx: 0.095, rz: 0.052, squareness: 2.3 },
        { y: 0.58, rx: 0.045, rz: 0.03, squareness: 2.1 },
      ],
      14
    )
  );
  ventralKeelGeo.rotateX(Math.PI * 0.5);
  const ventralKeel = reg(new THREE.Mesh(ventralKeelGeo, carbonMat));
  ventralKeel.position.set(0, -0.18, 0.1);
  chassis.add(ventralKeel);

  // Twin swept V-Tail aerodynamic stabilizers & rear central auxiliary afterburner nozzle!
  for (const side of [-1, 1] as const) {
    const tailBoom = new THREE.Group();
    tailBoom.position.set(side * 0.13, 0.11, 0.46);
    tailBoom.rotation.set(-0.24, side * 0.14, -side * 0.54);
    chassis.add(tailBoom);

    const finMain = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.042, 0.44, 0.24, 0.01)), hullMat)
    );
    finMain.position.set(0, 0.2, 0.06);
    tailBoom.add(finMain);

    const finTip = new THREE.Mesh(
      trackGeo(createBeveledBox(0.048, 0.09, 0.2, 0.008)),
      vermilionMat
    );
    finTip.position.set(0, 0.41, 0.1);
    tailBoom.add(finTip);
  }

  // Rear central auxiliary afterburner thruster ring + Mach-diamond exhaust plume (pointing +Z!)
  const rearNozzle = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.138, 0.16, 16)), jetMetalMat)
  );
  rearNozzle.rotation.x = Math.PI * 0.5;
  rearNozzle.position.set(0, 0.02, 0.68);
  chassis.add(rearNozzle);

  const rearDiffuser = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.095, 16)),
    diffuserGlowMat
  );
  rearDiffuser.position.set(0, 0.02, 0.755);
  chassis.add(rearDiffuser);

  const rearPlumeGeo = trackGeo(new THREE.ConeGeometry(0.082, 0.34, 14, 1, true));
  rearPlumeGeo.rotateX(Math.PI * 0.5);
  rearPlumeGeo.translate(0, 0, 0.17);
  const rearPlume = new THREE.Mesh(rearPlumeGeo, plumeOuterMat);
  rearPlume.position.set(0, 0.02, 0.74);
  chassis.add(rearPlume);

  // =========================================================================
  // 2. CENTRAL OPTIC GYRO-CORE WEAKPOINT + 4 ARTICULATED IRIS SHUTTER PETALS
  // =========================================================================
  const opticHousing = new THREE.Group();
  opticHousing.position.set(0, 0.0, -0.55);
  chassis.add(opticHousing);

  // Heavy machined titanium outer optical shroud ring
  const opticBezel = reg(
    new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.185, 0.036, 12, 24)), jetMetalMat)
  );
  opticHousing.add(opticBezel);

  // Rotating concentric brass/chrome gyro stabilizer ring inside bezel
  const gyroRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.156, 0.014, 8, 20)),
    chromeMat
  );
  gyroRing.position.z = -0.025;
  opticHousing.add(gyroRing);

  // Blazing electric-cyan Optic Gyro-Core spherical lens (`optic_gyro_core` weakpoint!)
  const opticCore = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.148, 20, 16)),
    weakpointMat
  );
  opticCore.position.z = -0.018;
  // Orient sphere pole toward -Z so radial iris reticle texture faces dead forward!
  opticCore.rotation.y = Math.PI * 0.5;
  opticHousing.add(opticCore);

  // 4 sculpted predatory armored iris shutter claws framing the cyan Optic Gyro-Core
  const irisPetals: THREE.Group[] = [];
  for (let p = 0; p < 4; p++) {
    const ang = (p * Math.PI) / 2 + Math.PI * 0.25;
    const petalPivot = new THREE.Group();
    petalPivot.rotation.z = ang;
    petalPivot.position.set(Math.cos(ang) * 0.205, Math.sin(ang) * 0.205, 0.01);
    opticHousing.add(petalPivot);

    // Wide beveled titanium armor hood with tapered forward claw & vermilion accent tip
    const petalBase = reg(
      new THREE.Mesh(
        trackGeo(createBeveledBox(0.085, 0.115, 0.12, 0.012)),
        p % 2 === 0 ? hullMat : carbonMat
      )
    );
    petalBase.position.set(-0.025, 0, -0.028);
    petalPivot.add(petalBase);

    const petalClawTip = new THREE.Mesh(
      trackGeo(createBeveledBox(0.045, 0.062, 0.055, 0.008)),
      vermilionMat
    );
    petalClawTip.position.set(-0.06, 0, -0.068);
    petalClawTip.rotation.y = 0.28;
    petalPivot.add(petalClawTip);

    irisPetals.push(petalPivot);
  }

  const weakpointAnchor = new THREE.Object3D();
  weakpointAnchor.position.set(0, 0, -0.08);
  opticHousing.add(weakpointAnchor);

  // Live wall-clipped Rail-Laser Scanner Beam projecting straight out of the Optic Gyro-Core (-Z)
  const railBeamGroup = new THREE.Group();
  railBeamGroup.position.set(0, 0, -0.14);
  railBeamGroup.visible = false;
  opticHousing.add(railBeamGroup);

  const bCoreGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 1, 8));
  bCoreGeo.rotateX(Math.PI * 0.5);
  bCoreGeo.translate(0, 0, -0.5);
  const beamCoreMesh = new THREE.Mesh(bCoreGeo, beamCoreMat);
  railBeamGroup.add(beamCoreMesh);

  const bHaloGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 1, 8));
  bHaloGeo.rotateX(Math.PI * 0.5);
  bHaloGeo.translate(0, 0, -0.5);
  const beamHaloMesh = new THREE.Mesh(bHaloGeo, beamHaloMat);
  railBeamGroup.add(beamHaloMesh);

  // =========================================================================
  // 3. TWIN SWEPT GULL-WING PYLONS, TILT-ROTOR VTOL DUCTED NACELLES & MICRO-ROCKET PODS
  // =========================================================================
  interface VtolNacelleRig {
    nacellePivot: THREE.Group;
    rotorGroup: THREE.Group;
    plumeGroup: THREE.Group;
    exhaustAnchor: THREE.Object3D;
    rocketMuzzle: THREE.Object3D;
  }

  // Sleek, layered Mach-diamond downwash ion plumes (base at y=0, soft fade-to-0 apex along -Y!)
  const outerPlumeGeo = trackGeo(new THREE.ConeGeometry(0.185, 0.44, 16, 1, true));
  outerPlumeGeo.rotateX(Math.PI);
  outerPlumeGeo.translate(0, -0.22, 0);

  const corePlumeGeo = trackGeo(new THREE.ConeGeometry(0.095, 0.28, 14, 1, true));
  corePlumeGeo.rotateX(Math.PI);
  corePlumeGeo.translate(0, -0.14, 0);

  const buildVtolWing = (side: -1 | 1): VtolNacelleRig => {
    // Swept aerodynamic gull-wing pylon anchored firmly to mid-fuselage
    const wingRoot = new THREE.Group();
    wingRoot.position.set(side * 0.31, 0.075, 0.02);
    chassis.add(wingRoot);

    const pylonSpar = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.44, 0.068, 0.25, 0.016)), hullMat)
    );
    pylonSpar.position.set(side * 0.19, 0.02, 0.02);
    pylonSpar.rotation.set(0, -side * 0.18, side * 0.1);
    wingRoot.add(pylonSpar);

    const pylonLowerStrut = new THREE.Mesh(
      trackGeo(createBeveledBox(0.34, 0.036, 0.12, 0.008)),
      carbonMat
    );
    pylonLowerStrut.position.set(side * 0.15, -0.032, 0.03);
    pylonLowerStrut.rotation.set(0, -side * 0.16, side * 0.22);
    wingRoot.add(pylonLowerStrut);

    const pylonStripe = new THREE.Mesh(
      trackGeo(createBeveledBox(0.34, 0.074, 0.048, 0.008)),
      vermilionMat
    );
    pylonStripe.position.set(side * 0.18, 0.022, -0.078);
    pylonStripe.rotation.set(0, -side * 0.18, side * 0.1);
    wingRoot.add(pylonStripe);

    // Sculpted Octagonal Under-Wing 4-Tube Aerospace Micro-Rocket Pod Launcher!
    const rocketPod = new THREE.Group();
    rocketPod.position.set(side * 0.16, -0.115, -0.04);
    wingRoot.add(rocketPod);

    const podShell = reg(
      new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.095, 0.088, 0.34, 8)), carbonMat)
    );
    podShell.rotation.x = Math.PI * 0.5;
    podShell.rotation.y = Math.PI / 8;
    rocketPod.add(podShell);

    const podCollar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.102, 0.102, 0.055, 8)),
      vermilionMat
    );
    podCollar.rotation.x = Math.PI * 0.5;
    podCollar.rotation.y = Math.PI / 8;
    podCollar.position.z = -0.115;
    rocketPod.add(podCollar);

    const podTailCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.068, 0.086, 0.06, 8)),
      jetMetalMat
    );
    podTailCap.rotation.x = Math.PI * 0.5;
    podTailCap.position.z = 0.185;
    rocketPod.add(podTailCap);

    for (const rx of [-0.035, 0.035]) {
      for (const ry of [-0.035, 0.035]) {
        const tube = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 10)),
          jetMetalMat
        );
        tube.rotation.x = Math.PI * 0.5;
        tube.position.set(rx, ry, -0.165);
        rocketPod.add(tube);

        const warhead = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.019, 0.052, 8)),
          rocketTipMat
        );
        warhead.rotation.x = -Math.PI * 0.5;
        warhead.position.set(rx, ry, -0.198);
        rocketPod.add(warhead);
      }
    }

    const rocketMuzzle = new THREE.Object3D();
    rocketMuzzle.position.set(0, 0, -0.24);
    rocketPod.add(rocketMuzzle);

    // ARTICULATED TILT-VECTORED VTOL DUCTED FAN NACELLE AT WINGTIP!
    const nacellePivot = new THREE.Group();
    nacellePivot.position.set(side * 0.45, 0.02, 0.04);
    wingRoot.add(nacellePivot);

    // Heavy titanium tilt-axle trunnion connecting pylon into nacelle
    const axle = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.16, 12)),
      chromeMat
    );
    axle.rotation.z = Math.PI * 0.5;
    axle.position.set(-side * 0.12, 0, 0);
    nacellePivot.add(axle);

    // Thick contoured circular ducted-fan cowling (outer pearl-titanium armor + inner heat-blued jet liner!)
    const outerShroud = reg(
      new THREE.Mesh(
        trackGeo(
          createCurvedPanelGeometry(
            [
              { y: -0.15, rx: 0.255, rz: 0.255, thickness: 0.048 },
              { y: 0.0, rx: 0.285, rz: 0.285, thickness: 0.056 },
              { y: 0.14, rx: 0.258, rz: 0.258, thickness: 0.044 },
            ],
            -Math.PI,
            Math.PI,
            24
          )
        ),
        hullMat
      )
    );
    nacellePivot.add(outerShroud);

    // Heat-blued exhaust nozzle lip below duct
    const exhaustRing = reg(
      new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.24, 0.21, 0.11, 20, 1, true)),
        jetMetalMat
      )
    );
    exhaustRing.position.y = -0.16;
    nacellePivot.add(exhaustRing);

    // Outer winglet stabilizer fin + aviation port (red) / starboard (emerald) strobe!
    const winglet = reg(
      new THREE.Mesh(trackGeo(createBeveledBox(0.036, 0.24, 0.2, 0.008)), vermilionMat)
    );
    winglet.position.set(side * 0.305, 0.05, 0.02);
    winglet.rotation.z = -side * 0.22;
    nacellePivot.add(winglet);

    const strobe = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.026, 8, 8)),
      side < 0 ? portStrobeMat : starboardStrobeMat
    );
    strobe.position.set(side * 0.335, 0.165, -0.02);
    nacellePivot.add(strobe);

    // Cross intake stator struts & central turbine spinner hub
    for (let s = 0; s < 2; s++) {
      const strut = new THREE.Mesh(
        trackGeo(createBeveledBox(0.48, 0.022, 0.032, 0.004)),
        carbonMat
      );
      strut.rotation.y = s * Math.PI * 0.5;
      strut.position.y = -0.09;
      nacellePivot.add(strut);
    }

    const turbineHub = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.068, 0.075, 0.24, 12)),
      chromeMat
    );
    nacellePivot.add(turbineHub);

    const spinnerCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.068, 0.09, 12)),
      vermilionMat
    );
    spinnerCone.position.y = 0.16;
    nacellePivot.add(spinnerCone);

    // High-speed 6-blade composite fan rotor + subtle motion-blur disc
    const rotorGroup = new THREE.Group();
    rotorGroup.position.y = 0.03;
    nacellePivot.add(rotorGroup);

    for (let b = 0; b < 6; b++) {
      const ang = (b * Math.PI * 2) / 6;
      const bladePivot = new THREE.Group();
      bladePivot.rotation.y = ang;
      const blade = new THREE.Mesh(
        trackGeo(createBeveledBox(0.21, 0.012, 0.052, 0.003)),
        carbonMat
      );
      blade.position.x = 0.125;
      blade.rotation.x = 0.34;
      bladePivot.add(blade);
      rotorGroup.add(bladePivot);
    }

    const blurDisc = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.075, 0.235, 20)),
      rotorBlurMat
    );
    blurDisc.rotation.x = -Math.PI * 0.5;
    blurDisc.position.y = 0.015;
    rotorGroup.add(blurDisc);

    // Recessed glowing cyan turbine plasma diffuser ring inside exhaust lip
    const turbineGlow = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.075, 0.205, 20)),
      diffuserGlowMat
    );
    turbineGlow.rotation.x = Math.PI * 0.5;
    turbineGlow.position.y = -0.175;
    nacellePivot.add(turbineGlow);

    // Layered glowing cyan Mach-diamond downwash ion thruster plume (base at y=0, soft apex along -Y!)
    const plumeGroup = new THREE.Group();
    plumeGroup.position.y = -0.18;
    nacellePivot.add(plumeGroup);

    plumeGroup.add(new THREE.Mesh(outerPlumeGeo, plumeOuterMat));
    plumeGroup.add(new THREE.Mesh(corePlumeGeo, plumeCoreMat));

    const exhaustAnchor = new THREE.Object3D();
    exhaustAnchor.position.set(0, -0.22, 0);
    nacellePivot.add(exhaustAnchor);

    return { nacellePivot, rotorGroup, plumeGroup, exhaustAnchor, rocketMuzzle };
  };

  const leftWing = buildVtolWing(-1);
  const rightWing = buildVtolWing(1);

  // =========================================================================
  // 4. SCULPTED 2-AXIS GIMBAL BALL-TURRET TWIN CHIN PULSE AUTOCANNON
  // =========================================================================
  const turretYaw = new THREE.Group();
  turretYaw.position.set(0, -0.23, -0.18);
  chassis.add(turretYaw);

  const turretRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.145, 0.165, 0.075, 16)),
    jetMetalMat
  );
  turretRing.position.y = 0.05;
  turretYaw.add(turretRing);

  const turretPitch = new THREE.Group();
  turretPitch.position.set(0, -0.025, 0);
  turretYaw.add(turretPitch);

  // Contoured aerospace gimbal turret sphere-pod (zero rectangular brick!)
  const turretPodGeo = trackGeo(
    createLoftedAnatomy(
      [
        { y: -0.17, rx: 0.085, rz: 0.052, squareness: 2.3 },
        { y: -0.06, rx: 0.142, rz: 0.078, squareness: 2.5 },
        { y: 0.06, rx: 0.145, rz: 0.082, squareness: 2.5 },
        { y: 0.17, rx: 0.095, rz: 0.056, squareness: 2.3 },
      ],
      16
    )
  );
  turretPodGeo.rotateX(Math.PI * 0.5);
  const turretBreech = reg(new THREE.Mesh(turretPodGeo, carbonMat));
  turretPitch.add(turretBreech);

  // Machined twin cheek trunnion plates & underslung feed canister
  const turretDrum = reg(
    new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.16, 14)), hullMat)
  );
  turretDrum.rotation.z = Math.PI * 0.5;
  turretDrum.position.set(0, -0.065, 0.03);
  turretPitch.add(turretDrum);

  const buildChinBarrel = (side: -1 | 1) => {
    const slide = new THREE.Group();
    slide.position.set(side * 0.11, -0.005, -0.15);
    turretPitch.add(slide);

    const shroud = reg(
      new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.038, 0.25, 12)), jetMetalMat)
    );
    shroud.rotation.x = Math.PI * 0.5;
    shroud.position.z = -0.11;
    slide.add(shroud);

    // Thin glowing cyan magnetic accelerator rail strip along outer barrel shroud
    const plasmaRail = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.012, 0.012, 0.22)),
      plasmaRailMat
    );
    plasmaRail.position.set(side * 0.032, 0.004, -0.12);
    slide.add(plasmaRail);

    const innerBarrel = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.017, 0.02, 0.44, 10)),
      chromeMat
    );
    innerBarrel.rotation.x = Math.PI * 0.5;
    innerBarrel.position.z = -0.22;
    slide.add(innerBarrel);

    const muzzleBrake = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.026, 0.021, 0.065, 10)),
      carbonMat
    );
    muzzleBrake.rotation.x = Math.PI * 0.5;
    muzzleBrake.position.z = -0.45;
    slide.add(muzzleBrake);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0, -0.5);
    slide.add(muzzle);

    return { slide, muzzle };
  };

  const barrelL = buildChinBarrel(-1);
  const barrelR = buildChinBarrel(1);

  // =========================================================================
  // 5. DEDICATED RAYCAST HITBOXES (Optic Gyro-Core Weakpoint + Gunship Body)
  // =========================================================================
  const bodyHitbox = createEnemyHitboxMesh(
    enemyId,
    'body',
    trackGeo(new THREE.BoxGeometry(1.72, 0.72, 1.24))
  );
  bodyHitbox.position.set(0, 0.02, 0.04);
  chassis.add(bodyHitbox);

  const wpHitbox = createEnemyHitboxMesh(
    enemyId,
    'weakpoint',
    trackGeo(new THREE.SphereGeometry(0.25, 12, 10)),
    'optic_gyro_core'
  );
  wpHitbox.position.set(0, 0, -0.58);
  chassis.add(wpHitbox);

  // Recoil & barrel tracking state
  let gunRecoilL = 0;
  let gunRecoilR = 0;
  let nextGunSide: -1 | 1 = -1;

  // =========================================================================
  // 6. PROCEDURAL FLIGHT, TILT-NACELLE, IRIS SHUTTER & ATTACK ANIMATIONS
  // =========================================================================
  const updateAnimation = (input: EnemyAnimationInput) => {
    const t = input.elapsed;
    const dt = Math.min(0.05, Math.max(0.001, input.dt));

    gunRecoilL = Math.max(0, gunRecoilL - dt * 8.5);
    gunRecoilR = Math.max(0, gunRecoilR - dt * 8.5);
    barrelL.slide.position.z = -0.16 + gunRecoilL * 0.095;
    barrelR.slide.position.z = -0.16 + gunRecoilR * 0.095;

    // Spin dual counter-rotating 6-blade VTOL rotors & inner gyro gimbal ring
    const boostScale = input.boosterIntensity ?? 0.55;
    const spinRate = 24 + boostScale * 18;
    leftWing.rotorGroup.rotation.y += dt * spinRate;
    rightWing.rotorGroup.rotation.y -= dt * spinRate;
    gyroRing.rotation.z += dt * (input.weakpointBroken ? 0.8 : 4.2);

    // Dying crash-spin animation (animates child chassis only!)
    if (input.behavior === 'dead') {
      const p = THREE.MathUtils.clamp(input.deadProgress, 0, 1);
      chassis.position.set(0, Math.max(0.18, 0.66 - p * 1.4), 0);
      chassis.rotation.set(p * 1.35, 0, p * 2.4);
      leftWing.plumeGroup.visible = false;
      rightWing.plumeGroup.visible = false;
      rearPlume.visible = false;
      railBeamGroup.visible = false;
      weakpointMat.emissiveIntensity = Math.max(0, 1.5 * (1 - p));
      return;
    }

    leftWing.plumeGroup.visible = true;
    rightWing.plumeGroup.visible = true;
    rearPlume.visible = true;

    // Weakpoint Optic Gyro-Core material state (crisp dark-sapphire reticle idle, blazing cyan on rail charge!)
    if (input.weakpointBroken) {
      weakpointMat.emissive.setHex(0x20485a);
      weakpointMat.emissiveIntensity = 0.24 + Math.abs(Math.sin(t * 23)) * 0.38;
    } else {
      const chargeBoost =
        (input.behavior === 'windup' || input.behavior === 'attack') &&
        (input.attackVariant === 1 || input.attackVariant === 4)
          ? 2.25
          : 0;
      weakpointMat.emissive.setHex(0x24dcff);
      weakpointMat.emissiveIntensity = 1.08 + chargeBoost + Math.sin(t * 8) * 0.16;
    }

    const hoverBob = Math.sin(t * 4.2) * 0.11;

    // Staggered crash-dip gyro malfunction when Optic Gyro-Core shatters!
    if (input.behavior === 'staggered' || input.staggerTimer > 0) {
      chassis.position.set(Math.sin(t * 17) * 0.08, 0.44 + hoverBob * 0.4, 0);
      chassis.rotation.set(0.32 + Math.sin(t * 14) * 0.12, 0, Math.sin(t * 19) * 0.48);
      leftWing.nacellePivot.rotation.x = -0.35 + Math.sin(t * 16) * 0.45;
      rightWing.nacellePivot.rotation.x = 0.35 - Math.sin(t * 16) * 0.45;
      leftWing.plumeGroup.scale.set(0.72, 0.52, 0.72);
      rightWing.plumeGroup.scale.set(0.72, 0.52, 0.72);
      railBeamGroup.visible = false;
      // Jam iris petals unevenly open
      for (let i = 0; i < irisPetals.length; i++) {
        irisPetals[i].rotation.y = 0.25 + (i % 2) * 0.45;
      }
      return;
    }

    // Standard agile aerial banking & VTOL tilt-rotor kinematics
    let bankRoll = THREE.MathUtils.clamp(-input.localMoveX * 0.32, -0.52, 0.52);
    let nosePitch = THREE.MathUtils.clamp(-input.localMoveZ * 0.2, -0.38, 0.32);
    // Negative X nacelle rotation tilts thrust BACKWARD (+Z) & DOWN (-Y) for forward acceleration!
    let nacellePitchL = THREE.MathUtils.clamp(-input.localMoveZ * 0.42, -0.78, 0.55);
    let nacellePitchR = nacellePitchL;
    let nacelleRollOut = 0;
    let plumeScaleY = 0.72 + boostScale * 0.36 + Math.sin(t * 32) * 0.06;
    let irisFlare = 0.14;

    // === ATTACK VARIANT FLIGHT CHOREOGRAPHY ===
    if (input.behavior === 'windup' || input.behavior === 'attack') {
      const p = THREE.MathUtils.clamp(input.attackProgress, 0, 1);
      const isWindup = input.behavior === 'windup';

      if (input.attackVariant === 1) {
        // VARIANT 1: RAIL-LASER SWEEP — Locked dead-steady hover, iris shutters FLARED WIDE OPEN!
        bankRoll *= 0.25;
        nosePitch = isWindup ? -0.06 : 0.14 * (1 - p); // sharp upward recoil kick on rail firing!
        nacellePitchL = 0.14;
        nacellePitchR = 0.14;
        irisFlare = isWindup ? 0.25 + p * 0.65 : 0.85;
        plumeScaleY = 0.88 + p * 0.22;
      } else if (input.attackVariant === 2) {
        // VARIANT 2: VALKYRIE DIVE-STRAFE RUN — Hard aggressive forward nose-dive & steep banked gunship pass!
        nosePitch = -0.34;
        bankRoll = (input.localMoveX >= 0 ? -1 : 1) * 0.46;
        nacellePitchL = -0.74;
        nacellePitchR = -0.74;
        plumeScaleY = 1.18 + Math.sin(t * 40) * 0.1;
        irisFlare = 0.42;
      } else if (input.attackVariant === 3) {
        // VARIANT 3: MICRO-ROCKET SALVO — Pitches nose slightly up to loft 4 wing-pod rockets!
        nosePitch = 0.16;
        nacellePitchL = 0.24;
        nacellePitchR = 0.24;
        irisFlare = 0.48;
      } else if (input.attackVariant === 4) {
        // VARIANT 4: EMP SHOCK-PULSE — Drops low, flares both VTOL nacelles WIDE outward & discharges 360° cyan ring!
        nacelleRollOut = isWindup ? p * 0.46 : 0.52 * (1 - p * 0.4);
        nosePitch = isWindup ? 0.18 * p : -0.14;
        plumeScaleY = 1.12;
        irisFlare = 0.92;
      }
    }

    // Subtle hit flinch shudder
    if (input.flinchTimer > 0) {
      const f = Math.min(1, input.flinchTimer / 0.15);
      bankRoll += input.flinchDirX * 0.24 * f;
      nosePitch += 0.14 * f;
    }

    chassis.position.set(0, 0.66 + hoverBob, 0);
    chassis.rotation.set(nosePitch, 0, bankRoll);

    leftWing.nacellePivot.rotation.set(nacellePitchL, 0, nacelleRollOut);
    rightWing.nacellePivot.rotation.set(nacellePitchR, 0, -nacelleRollOut);

    const plumeW = 0.86 + boostScale * 0.14;
    leftWing.plumeGroup.scale.set(plumeW, plumeScaleY, plumeW);
    rightWing.plumeGroup.scale.set(plumeW, plumeScaleY, plumeW);
    rearPlume.scale.set(0.84, 0.84, 0.65 + boostScale * 0.55);

    // Articulate the 4 predatory nose iris shutter claws around the glowing cyan Optic Gyro-Core
    for (let i = 0; i < irisPetals.length; i++) {
      irisPetals[i].rotation.y = input.weakpointBroken ? 0.55 + (i % 2) * 0.25 : irisFlare;
    }

    // Track player elevation cleanly with the 2-axis chin pulse autocannon turret
    turretPitch.rotation.x = THREE.MathUtils.clamp(input.aimPitch, -0.78, 0.42);
  };

  return {
    root,
    hitboxes: [wpHitbox, bodyHitbox],
    weakpointMaterials: [weakpointMat],
    armorFlashMaterials: [hullMat],
    updateAnimation,
    getMuzzleWorldPos: (out: THREE.Vector3) => {
      const b = nextGunSide < 0 ? barrelL : barrelR;
      nextGunSide = nextGunSide < 0 ? 1 : -1;
      return b.muzzle.getWorldPosition(out);
    },
    getGunMuzzleWorldPos: (side: -1 | 1, out: THREE.Vector3) =>
      (side < 0 ? barrelL : barrelR).muzzle.getWorldPosition(out),
    getRocketPodWorldPos: (side: -1 | 1, out: THREE.Vector3) =>
      (side < 0 ? leftWing : rightWing).rocketMuzzle.getWorldPosition(out),
    getThrusterExhaustWorldPos: (side: -1 | 1, out: THREE.Vector3) =>
      (side < 0 ? leftWing : rightWing).exhaustAnchor.getWorldPosition(out),
    getWeakpointWorldPos: (out: THREE.Vector3) => weakpointAnchor.getWorldPosition(out),
    triggerGunRecoil: (side: -1 | 1) => {
      if (side < 0) gunRecoilL = 1;
      else gunRecoilR = 1;
    },
    setRailBeam: (active: boolean, length: number, chargeRatio: number) => {
      railBeamGroup.visible = active && length > 0.25;
      if (!railBeamGroup.visible) return;
      const c = THREE.MathUtils.clamp(chargeRatio, 0, 1);
      const widthScale = 0.75 + c * 1.45;
      railBeamGroup.scale.set(widthScale, widthScale, Math.max(0.25, length));
      beamCoreMat.color.setRGB(0.65 + c * 0.35, 0.96, 1.0);
      beamCoreMat.opacity = 0.55 + c * 0.45;
      beamHaloMat.opacity = 0.22 + c * 0.42;
    },
    dispose: () => {
      for (const g of disposedGeos) g.dispose();
      for (const m of disposedMats) m.dispose();
      if (ownsTextures) tex.dispose();
    },
  };
}
