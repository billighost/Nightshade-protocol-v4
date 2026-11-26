import type { ReloadBannerKind, WeaponId, WeaponSystemState } from '../core/types';

export interface WeaponFireEvent {
  weapon: WeaponId;
  damage: number;
  overcharged: boolean;
  spreadRad: number;
  recoilPitch: number;
  recoilYaw: number;
  heatRatio: number;
}

export interface WeaponStepResult {
  fired: WeaponFireEvent | null;
  events: Array<
    | 'swap'
    | 'pistol_reload_start'
    | 'pistol_perfect_reload'
    | 'pistol_jam'
    | 'pistol_reload_done'
    | 'smg_vent_start'
    | 'smg_flash_cool'
    | 'smg_overheat'
    | 'smg_vent_done'
    | 'heavy_reload_start'
    | 'heavy_reload_done'
    | 'dry_fire'
  >;
}

export const PISTOL_CONFIG = {
  maxAmmo: 18, // Generous extended tactical 9mm mag
  fireInterval: 0.22, // ~4.5 rounds/sec crisp semi-auto cadence
  baseDamage: 30,
  overchargedDamage: 48,
  overchargedCount: 4,
  reloadDuration: 1.55,
  jamDuration: 0.62,
  sweetSpotStart: 0.46,
  sweetSpotEnd: 0.68,
  baseSpread: 0.0055,
  adsSpread: 0.0016,
  spreadPerShot: 0.01,
  maxSpread: 0.046,
  spreadRecovery: 0.09,
  recoilPitch: 0.03,
  recoilYawRange: 0.008,
} as const;

/**
 * VIPER-X4 Cryo-Rail SMG — Rebalanced to AAA heat-weapon standards (Halo / Battlefront / Apex):
 * ~47 continuous shots (~3.65 seconds sustained trigger hold!) before thermal lockout,
 * responsive cooling between bursts, and rewarding 65%..95% Flash-Cool active vent window!
 */
export const SMG_CONFIG = {
  fireInterval: 0.078, // ~12.8 rounds/sec rapid auto
  flashCoolFireInterval: 0.062, // ~16.1 rounds/sec cryo-surge
  baseDamage: 14,
  heatPerShot: 2.15, // ~47 continuous shots (~3.65s full-auto!) before overheat!
  coolDelaySec: 0.28, // brief realistic thermal soak before passive cooling begins
  passiveCoolRate: 28, // crisp passive cool when feathering bursts
  manualVentRate: 62,
  flashCoolVentRate: 92,
  overheatCoolRate: 30, // ~3.3s dramatic steaming/sparking emergency thermal purge
  flashCoolMinHeat: 65,
  flashCoolMaxHeat: 95,
  flashCoolDuration: 3.4,
  baseSpread: 0.013,
  adsSpread: 0.0055,
  spreadPerShot: 0.0045,
  maxSpread: 0.062,
  spreadRecovery: 0.115,
  recoilPitch: 0.013,
  recoilYawRange: 0.013,
} as const;

/**
 * VULCAN-50 Heavy .50-Cal Kinetic Battle Rifle / Marksman Cannon (Ammo-Crate Fed):
 * Thundering heavy-hitting automatic battle rifle (CoD MW Oden / ASh-12.7 / SCAR-H feel),
 * generous 20-round box mag + 80 starting reserve (120 max), replenished from bay supply crates!
 */
export const HEAVY_CONFIG = {
  maxAmmo: 20,
  startingReserve: 80,
  maxReserve: 120,
  cratePickupAmount: 40,
  fireInterval: 0.23, // ~260 RPM rhythmic heavy-thumping full-auto or crisp single taps
  baseDamage: 62, // heavy-hitting .50-cal kinetic punch without trivializing armored enemies
  reloadDuration: 1.9,
  baseSpread: 0.0085,
  adsSpread: 0.0014,
  spreadPerShot: 0.015,
  maxSpread: 0.058,
  spreadRecovery: 0.088,
  recoilPitch: 0.048,
  recoilYawRange: 0.014,
} as const;

export const SWAP_DURATION = 0.68;

export function createInitialWeaponState(): WeaponSystemState {
  return {
    activeWeapon: 'pistol',
    swapFromWeapon: 'pistol',
    swapTimer: 0,
    pistol: {
      ammo: PISTOL_CONFIG.maxAmmo,
      maxAmmo: PISTOL_CONFIG.maxAmmo,
      fireCooldown: 0,
      spread: PISTOL_CONFIG.baseSpread,
      overchargedRounds: 0,
      reloadPhase: 'idle',
      reloadProgress: 0,
      reloadAttempted: false,
      sweetSpotStart: PISTOL_CONFIG.sweetSpotStart,
      sweetSpotEnd: PISTOL_CONFIG.sweetSpotEnd,
    },
    smg: {
      heat: 0,
      overheated: false,
      venting: false,
      ventProgress: 0,
      flashCoolTimer: 0,
      fireCooldown: 0,
      spread: SMG_CONFIG.baseSpread,
      shotsInBurst: 0,
      coolDelayTimer: 0,
    },
    heavy: {
      ammo: HEAVY_CONFIG.maxAmmo,
      maxAmmo: HEAVY_CONFIG.maxAmmo,
      reserveAmmo: HEAVY_CONFIG.startingReserve,
      maxReserveAmmo: HEAVY_CONFIG.maxReserve,
      reloading: false,
      reloadProgress: 0,
      fireCooldown: 0,
      spread: HEAVY_CONFIG.baseSpread,
    },
    bannerKind: 'none',
    bannerTimer: 0,
  };
}

function setBanner(state: WeaponSystemState, kind: ReloadBannerKind, duration = 1.4): void {
  state.bannerKind = kind;
  state.bannerTimer = duration;
}

/** Replenishes VULCAN-50 reserve ammo from a tactical supply crate. Returns actual rounds added. */
export function addHeavyAmmo(state: WeaponSystemState, amount: number): number {
  const h = state.heavy;
  const space = Math.max(0, h.maxReserveAmmo - h.reserveAmmo);
  const added = Math.min(space, Math.max(0, Math.round(amount)));
  if (added > 0) {
    h.reserveAmmo += added;
    setBanner(state, 'ammo_pickup', 1.7);
  }
  return added;
}

export function switchWeapon(state: WeaponSystemState, target: WeaponId): boolean {
  if (state.activeWeapon === target) return false;
  state.swapFromWeapon = state.activeWeapon;
  state.activeWeapon = target;
  state.swapTimer = SWAP_DURATION;

  // Cancel incomplete reloads cleanly when stowing
  if (target !== 'pistol' && state.pistol.reloadPhase !== 'idle') {
    state.pistol.reloadPhase = 'idle';
    state.pistol.reloadProgress = 0;
    state.pistol.reloadAttempted = false;
  }
  if (target !== 'smg' && state.smg.venting && !state.smg.overheated) {
    state.smg.venting = false;
  }
  if (target !== 'heavy' && state.heavy.reloading) {
    state.heavy.reloading = false;
    state.heavy.reloadProgress = 0;
  }
  return true;
}

export interface WeaponStepInput {
  dt: number;
  fireHeld: boolean;
  fireJustPressed: boolean;
  reloadJustPressed: boolean;
  ads: boolean;
  movingSpeedRatio: number;
  crouching: boolean;
  rng?: () => number;
}

export function stepWeaponSystem(
  state: WeaponSystemState,
  input: WeaponStepInput
): WeaponStepResult {
  const dt = Math.max(0, Math.min(input.dt, 0.05));
  const rng = input.rng ?? Math.random;
  const events: WeaponStepResult['events'] = [];
  let fired: WeaponFireEvent | null = null;

  // Timers
  if (state.swapTimer > 0) {
    state.swapTimer = Math.max(0, state.swapTimer - dt);
  }
  if (state.bannerTimer > 0) {
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
    if (state.bannerTimer === 0) {
      state.bannerKind = 'none';
    }
  }
  if (state.pistol.fireCooldown > 0) {
    state.pistol.fireCooldown = Math.max(0, state.pistol.fireCooldown - dt);
  }
  if (state.smg.fireCooldown > 0) {
    state.smg.fireCooldown = Math.max(0, state.smg.fireCooldown - dt);
  }
  if (state.smg.flashCoolTimer > 0) {
    state.smg.flashCoolTimer = Math.max(0, state.smg.flashCoolTimer - dt);
  }
  if (state.smg.coolDelayTimer > 0) {
    state.smg.coolDelayTimer = Math.max(0, state.smg.coolDelayTimer - dt);
  }
  if (state.heavy.fireCooldown > 0) {
    state.heavy.fireCooldown = Math.max(0, state.heavy.fireCooldown - dt);
  }

  // Spread targets
  const moveSpreadPenalty = input.movingSpeedRatio * 0.012;
  const crouchMult = input.crouching ? 0.65 : 1.0;

  const pistolTargetSpread =
    (input.ads ? PISTOL_CONFIG.adsSpread : PISTOL_CONFIG.baseSpread) * crouchMult +
    moveSpreadPenalty * 0.6;
  state.pistol.spread +=
    (pistolTargetSpread - state.pistol.spread) * Math.min(1, PISTOL_CONFIG.spreadRecovery * dt * 16);

  const smgTargetSpread =
    (input.ads ? SMG_CONFIG.adsSpread : SMG_CONFIG.baseSpread) * crouchMult + moveSpreadPenalty;
  state.smg.spread +=
    (smgTargetSpread - state.smg.spread) * Math.min(1, SMG_CONFIG.spreadRecovery * dt * 16);

  const heavyTargetSpread =
    (input.ads ? HEAVY_CONFIG.adsSpread : HEAVY_CONFIG.baseSpread) * crouchMult +
    moveSpreadPenalty * 0.85;
  state.heavy.spread +=
    (heavyTargetSpread - state.heavy.spread) * Math.min(1, HEAVY_CONFIG.spreadRecovery * dt * 16);

  // Passive SMG cooling even when stowed
  if (state.activeWeapon !== 'smg') {
    if (state.smg.heat > 0) {
      const rate = state.smg.overheated
        ? SMG_CONFIG.overheatCoolRate
        : SMG_CONFIG.passiveCoolRate;
      state.smg.heat = Math.max(0, state.smg.heat - rate * dt);
      if (state.smg.heat === 0) {
        state.smg.overheated = false;
        state.smg.venting = false;
      }
    }
  }

  // --- ACTIVE WEAPON 1: SPECTRE-9 SUPPRESSED PISTOL ---
  if (state.activeWeapon === 'pistol') {
    const p = state.pistol;

    if (input.reloadJustPressed && state.swapTimer === 0) {
      if (p.reloadPhase === 'idle' && p.ammo < p.maxAmmo) {
        p.reloadPhase = 'active';
        p.reloadProgress = 0;
        p.reloadAttempted = false;
        events.push('pistol_reload_start');
      } else if (p.reloadPhase === 'active' && !p.reloadAttempted && p.reloadProgress > 0.14) {
        p.reloadAttempted = true;
        if (p.reloadProgress >= p.sweetSpotStart && p.reloadProgress <= p.sweetSpotEnd) {
          p.ammo = p.maxAmmo;
          p.overchargedRounds = PISTOL_CONFIG.overchargedCount;
          p.reloadPhase = 'idle';
          p.reloadProgress = 0;
          p.reloadAttempted = false;
          setBanner(state, 'perfect_reload', 1.6);
          events.push('pistol_perfect_reload');
        } else {
          p.reloadPhase = 'jammed';
          p.reloadProgress = 0;
          setBanner(state, 'jammed', 1.2);
          events.push('pistol_jam');
        }
      }
    }

    if (p.reloadPhase === 'active') {
      p.reloadProgress += dt / PISTOL_CONFIG.reloadDuration;
      if (p.reloadProgress >= 1) {
        p.ammo = p.maxAmmo;
        p.reloadPhase = 'idle';
        p.reloadProgress = 0;
        p.reloadAttempted = false;
        events.push('pistol_reload_done');
      }
    } else if (p.reloadPhase === 'jammed') {
      p.reloadProgress += dt / PISTOL_CONFIG.jamDuration;
      if (p.reloadProgress >= 1) {
        p.ammo = p.maxAmmo;
        p.reloadPhase = 'idle';
        p.reloadProgress = 0;
        p.reloadAttempted = false;
        events.push('pistol_reload_done');
      }
    }

    if (input.fireJustPressed && state.swapTimer === 0 && p.reloadPhase === 'idle') {
      if (p.ammo <= 0) {
        events.push('dry_fire');
        p.reloadPhase = 'active';
        p.reloadProgress = 0;
        p.reloadAttempted = false;
        events.push('pistol_reload_start');
      } else if (p.fireCooldown === 0) {
        const isOvercharged = p.overchargedRounds > 0;
        p.ammo -= 1;
        if (isOvercharged) p.overchargedRounds -= 1;
        p.fireCooldown = PISTOL_CONFIG.fireInterval;

        const shotSpread = p.spread;
        p.spread = Math.min(PISTOL_CONFIG.maxSpread, p.spread + PISTOL_CONFIG.spreadPerShot);

        fired = {
          weapon: 'pistol',
          damage: isOvercharged ? PISTOL_CONFIG.overchargedDamage : PISTOL_CONFIG.baseDamage,
          overcharged: isOvercharged,
          spreadRad: shotSpread,
          recoilPitch: PISTOL_CONFIG.recoilPitch * (input.ads ? 0.72 : 1),
          recoilYaw: (rng() * 2 - 1) * PISTOL_CONFIG.recoilYawRange,
          heatRatio: 0,
        };
      }
    }
  }

  // --- ACTIVE WEAPON 2: VIPER-X4 CRYO-RAIL SMG (NO AMMO, REALISTIC HEAT CURVE) ---
  if (state.activeWeapon === 'smg') {
    const s = state.smg;

    if (
      input.reloadJustPressed &&
      state.swapTimer === 0 &&
      !s.venting &&
      !s.overheated &&
      s.heat >= 12
    ) {
      s.venting = true;
      s.ventProgress = 0;
      if (s.heat >= SMG_CONFIG.flashCoolMinHeat && s.heat <= SMG_CONFIG.flashCoolMaxHeat) {
        s.flashCoolTimer = SMG_CONFIG.flashCoolDuration;
        setBanner(state, 'flash_cool', 1.6);
        events.push('smg_flash_cool');
      } else {
        events.push('smg_vent_start');
      }
    }

    if (s.overheated) {
      s.venting = true;
      s.heat = Math.max(0, s.heat - SMG_CONFIG.overheatCoolRate * dt);
      s.ventProgress = 1 - s.heat / 100;
      if (s.heat <= 0) {
        s.overheated = false;
        s.venting = false;
        s.ventProgress = 0;
        events.push('smg_vent_done');
      }
    } else if (s.venting) {
      const rate =
        s.flashCoolTimer > 0 ? SMG_CONFIG.flashCoolVentRate : SMG_CONFIG.manualVentRate;
      s.heat = Math.max(0, s.heat - rate * dt);
      s.ventProgress = 1 - s.heat / 100;
      if (s.heat <= 0) {
        s.venting = false;
        s.ventProgress = 0;
        events.push('smg_vent_done');
      }
    } else if (!input.fireHeld) {
      s.shotsInBurst = 0;
      if (s.heat > 0 && s.coolDelayTimer === 0) {
        s.heat = Math.max(0, s.heat - SMG_CONFIG.passiveCoolRate * dt);
      }
    }

    if (input.fireHeld && state.swapTimer === 0 && !s.venting && !s.overheated) {
      if (s.fireCooldown === 0) {
        const flashActive = s.flashCoolTimer > 0;
        s.fireCooldown = flashActive
          ? SMG_CONFIG.flashCoolFireInterval
          : SMG_CONFIG.fireInterval;
        s.coolDelayTimer = SMG_CONFIG.coolDelaySec;
        s.shotsInBurst += 1;

        const heatGain = flashActive ? SMG_CONFIG.heatPerShot * 0.68 : SMG_CONFIG.heatPerShot;
        s.heat = Math.min(100, s.heat + heatGain);

        const shotSpread = s.spread;
        s.spread = Math.min(SMG_CONFIG.maxSpread, s.spread + SMG_CONFIG.spreadPerShot);

        fired = {
          weapon: 'smg',
          damage: SMG_CONFIG.baseDamage,
          overcharged: flashActive,
          spreadRad: shotSpread,
          recoilPitch:
            SMG_CONFIG.recoilPitch *
            (input.ads ? 0.72 : 1) *
            (1 + Math.min(0.45, s.shotsInBurst * 0.015)),
          recoilYaw: (rng() * 2 - 1) * SMG_CONFIG.recoilYawRange,
          heatRatio: s.heat / 100,
        };

        if (s.heat >= 100) {
          s.overheated = true;
          s.venting = true;
          s.flashCoolTimer = 0;
          setBanner(state, 'overheated', 2.0);
          events.push('smg_overheat');
        }
      }
    } else if (input.fireJustPressed && (s.overheated || s.venting)) {
      events.push('dry_fire');
    }
  }

  // --- ACTIVE WEAPON 3: VULCAN-50 HEAVY .50-CAL KINETIC BATTLE RIFLE (CRATE-FED AMMO!) ---
  if (state.activeWeapon === 'heavy') {
    const h = state.heavy;

    // Trigger Reserve-Fed Tactical Reload
    if (
      input.reloadJustPressed &&
      state.swapTimer === 0 &&
      !h.reloading &&
      h.ammo < h.maxAmmo
    ) {
      if (h.reserveAmmo > 0) {
        h.reloading = true;
        h.reloadProgress = 0;
        events.push('heavy_reload_start');
      } else {
        setBanner(state, 'no_heavy_ammo', 1.6);
        events.push('dry_fire');
      }
    }

    // Advance Heavy Reload
    if (h.reloading) {
      h.reloadProgress += dt / HEAVY_CONFIG.reloadDuration;
      if (h.reloadProgress >= 1) {
        const needed = h.maxAmmo - h.ammo;
        const load = Math.min(needed, h.reserveAmmo);
        h.ammo += load;
        h.reserveAmmo -= load;
        h.reloading = false;
        h.reloadProgress = 0;
        events.push('heavy_reload_done');
      }
    }

    // Heavy Rhythmic Full-Auto / Tap Fire
    if ((input.fireHeld || input.fireJustPressed) && state.swapTimer === 0 && !h.reloading) {
      if (h.ammo <= 0) {
        if (input.fireJustPressed) {
          events.push('dry_fire');
          if (h.reserveAmmo > 0) {
            h.reloading = true;
            h.reloadProgress = 0;
            events.push('heavy_reload_start');
          } else {
            setBanner(state, 'no_heavy_ammo', 1.8);
          }
        }
      } else if (h.fireCooldown === 0) {
        h.ammo -= 1;
        h.fireCooldown = HEAVY_CONFIG.fireInterval;

        const shotSpread = h.spread;
        h.spread = Math.min(HEAVY_CONFIG.maxSpread, h.spread + HEAVY_CONFIG.spreadPerShot);

        fired = {
          weapon: 'heavy',
          damage: HEAVY_CONFIG.baseDamage,
          overcharged: false,
          spreadRad: shotSpread,
          recoilPitch: HEAVY_CONFIG.recoilPitch * (input.ads ? 0.72 : 1),
          recoilYaw: (rng() * 2 - 1) * HEAVY_CONFIG.recoilYawRange,
          heatRatio: 0,
        };
      }
    }
  }

  return { fired, events };
}
