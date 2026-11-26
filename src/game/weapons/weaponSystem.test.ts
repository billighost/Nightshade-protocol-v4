import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addHeavyAmmo,
  createInitialWeaponState,
  HEAVY_CONFIG,
  PISTOL_CONFIG,
  SMG_CONFIG,
  stepWeaponSystem,
  switchWeapon,
} from './weaponSystem';

test('SPECTRE-9 pistol has 18-round extended mag, fires semi-auto, and enforces fire cooldown', () => {
  const state = createInitialWeaponState();
  assert.equal(PISTOL_CONFIG.maxAmmo, 18);
  assert.equal(state.pistol.ammo, 18);

  const first = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: true,
    fireJustPressed: true,
    reloadJustPressed: false,
    ads: false,
    movingSpeedRatio: 0,
    crouching: false,
    rng: () => 0.5,
  });

  assert.ok(first.fired, 'First trigger pull should fire');
  assert.equal(first.fired.weapon, 'pistol');
  assert.equal(state.pistol.ammo, PISTOL_CONFIG.maxAmmo - 1);

  // Holding fire without a new press should NOT auto-fire pistol
  const held = stepWeaponSystem(state, {
    dt: 0.05,
    fireHeld: true,
    fireJustPressed: false,
    reloadJustPressed: false,
    ads: false,
    movingSpeedRatio: 0,
    crouching: false,
  });
  assert.equal(held.fired, null);
});

test('SPECTRE-9 active-timing reload rewards sweet-spot press with instant reload & overcharged rounds', () => {
  const state = createInitialWeaponState();
  state.pistol.ammo = 4;

  // Start reload
  const startRes = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: false,
    fireJustPressed: false,
    reloadJustPressed: true,
    ads: false,
    movingSpeedRatio: 0,
    crouching: false,
  });
  assert.equal(state.pistol.reloadPhase, 'active');
  assert.ok(startRes.events.includes('pistol_reload_start'));

  // Advance progress into sweet-spot [0.46..0.68]
  state.pistol.reloadProgress = 0.55;
  const hitRes = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: false,
    fireJustPressed: false,
    reloadJustPressed: true,
    ads: false,
    movingSpeedRatio: 0,
    crouching: false,
  });

  assert.ok(hitRes.events.includes('pistol_perfect_reload'));
  assert.equal(state.pistol.reloadPhase, 'idle');
  assert.equal(state.pistol.ammo, PISTOL_CONFIG.maxAmmo);
  assert.equal(state.pistol.overchargedRounds, PISTOL_CONFIG.overchargedCount);
  assert.equal(state.bannerKind, 'perfect_reload');

  // Next shot deals overcharged damage
  const shot = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: true,
    fireJustPressed: true,
    reloadJustPressed: false,
    ads: true,
    movingSpeedRatio: 0,
    crouching: false,
    rng: () => 0.5,
  });
  assert.ok(shot.fired?.overcharged);
  assert.equal(shot.fired?.damage, PISTOL_CONFIG.overchargedDamage);
});

test('SPECTRE-9 missing active-timing sweet-spot triggers jam fumble before completing reload', () => {
  const state = createInitialWeaponState();
  state.pistol.ammo = 2;
  state.pistol.reloadPhase = 'active';
  state.pistol.reloadProgress = 0.25; // Too early

  const missRes = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: false,
    fireJustPressed: false,
    reloadJustPressed: true,
    ads: false,
    movingSpeedRatio: 0,
    crouching: false,
  });

  assert.ok(missRes.events.includes('pistol_jam'));
  assert.equal(state.pistol.reloadPhase, 'jammed');
  assert.equal(state.bannerKind, 'jammed');

  // Step through jam duration
  for (let i = 0; i < 20; i++) {
    stepWeaponSystem(state, {
      dt: 0.05,
      fireHeld: false,
      fireJustPressed: false,
      reloadJustPressed: false,
      ads: false,
      movingSpeedRatio: 0,
      crouching: false,
    });
  }
  assert.equal(state.pistol.reloadPhase, 'idle');
  assert.equal(state.pistol.ammo, PISTOL_CONFIG.maxAmmo);
});

test('VIPER-X4 sustains realistic ~3.5s+ continuous burst before overheat, honors coolDelay, and rewards 65..95% Flash-Cool', () => {
  const state = createInitialWeaponState();
  assert.equal(switchWeapon(state, 'smg'), true);

  // Finish full 0.68s physical stow/draw swap timer
  for (let i = 0; i < 20; i++) {
    stepWeaponSystem(state, {
      dt: 0.04,
      fireHeld: false,
      fireJustPressed: false,
      reloadJustPressed: false,
      ads: false,
      movingSpeedRatio: 0,
      crouching: false,
    });
  }
  assert.equal(state.swapTimer, 0);

  // Measure continuous full-auto duration until 100% overheat
  let continuousShots = 0;
  let elapsed = 0;
  let overheatedEvent = false;
  for (let i = 0; i < 400 && !state.smg.overheated; i++) {
    const dt = 0.016;
    elapsed += dt;
    const res = stepWeaponSystem(state, {
      dt,
      fireHeld: true,
      fireJustPressed: i === 0,
      reloadJustPressed: false,
      ads: false,
      movingSpeedRatio: 0,
      crouching: false,
      rng: () => 0.5,
    });
    if (res.fired) continuousShots++;
    if (res.events.includes('smg_overheat')) overheatedEvent = true;
  }

  assert.equal(overheatedEvent, true, 'Sustained fire must eventually trigger overheat');
  assert.equal(state.smg.overheated, true);
  assert.ok(
    continuousShots >= 44 && continuousShots <= 50,
    `Expected ~47 continuous shots before overheat, got ${continuousShots}`
  );
  assert.ok(
    elapsed >= 3.3,
    `Expected >= 3.3s continuous trigger hold before overheat, got ${elapsed.toFixed(2)}s`
  );

  // Reset heat into Flash-Cool sweet zone [65..95] and test Flash-Cool active vent
  state.smg.overheated = false;
  state.smg.venting = false;
  state.smg.heat = 76;
  const ventRes = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: false,
    fireJustPressed: false,
    reloadJustPressed: true,
    ads: false,
    movingSpeedRatio: 0,
    crouching: false,
  });
  assert.ok(ventRes.events.includes('smg_flash_cool'));
  assert.equal(state.smg.venting, true);
  assert.ok(state.smg.flashCoolTimer > 0);
});

test('VULCAN-50 heavy .50-cal battle rifle fires high-damage rounds, reloads from reserve, handles empty reserve, and resupplies from crates', () => {
  const state = createInitialWeaponState();
  assert.equal(state.heavy.ammo, HEAVY_CONFIG.maxAmmo);
  assert.equal(state.heavy.reserveAmmo, HEAVY_CONFIG.startingReserve);
  assert.equal(switchWeapon(state, 'heavy'), true);

  // Complete swap
  for (let i = 0; i < 20; i++) {
    stepWeaponSystem(state, {
      dt: 0.04,
      fireHeld: false,
      fireJustPressed: false,
      reloadJustPressed: false,
      ads: false,
      movingSpeedRatio: 0,
      crouching: false,
    });
  }
  assert.equal(state.swapTimer, 0);

  // Fire a heavy shot
  const shot = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: true,
    fireJustPressed: true,
    reloadJustPressed: false,
    ads: true,
    movingSpeedRatio: 0,
    crouching: false,
    rng: () => 0.5,
  });
  assert.ok(shot.fired);
  assert.equal(shot.fired.weapon, 'heavy');
  assert.equal(shot.fired.damage, HEAVY_CONFIG.baseDamage);
  assert.equal(state.heavy.ammo, HEAVY_CONFIG.maxAmmo - 1);

  // Reload draws missing rounds from reserveAmmo
  state.heavy.ammo = 5;
  const startReload = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: false,
    fireJustPressed: false,
    reloadJustPressed: true,
    ads: false,
    movingSpeedRatio: 0,
    crouching: false,
  });
  assert.ok(startReload.events.includes('heavy_reload_start'));
  assert.equal(state.heavy.reloading, true);

  let reloadDone = false;
  for (let i = 0; i < 50; i++) {
    const stepRes = stepWeaponSystem(state, {
      dt: 0.045,
      fireHeld: false,
      fireJustPressed: false,
      reloadJustPressed: false,
      ads: false,
      movingSpeedRatio: 0,
      crouching: false,
    });
    if (stepRes.events.includes('heavy_reload_done')) reloadDone = true;
  }
  assert.equal(reloadDone, true);
  assert.equal(state.heavy.ammo, HEAVY_CONFIG.maxAmmo);
  assert.equal(state.heavy.reserveAmmo, HEAVY_CONFIG.startingReserve - 15);

  // Crate pickup replenishes reserve and clamps strictly to maxReserve
  const added1 = addHeavyAmmo(state, HEAVY_CONFIG.cratePickupAmount);
  assert.equal(added1, 40);
  assert.equal(state.heavy.reserveAmmo, HEAVY_CONFIG.startingReserve - 15 + 40);
  assert.equal(state.bannerKind, 'ammo_pickup');

  const added2 = addHeavyAmmo(state, 999);
  assert.equal(state.heavy.reserveAmmo, HEAVY_CONFIG.maxReserve);
  assert.equal(added2, HEAVY_CONFIG.maxReserve - (HEAVY_CONFIG.startingReserve - 15 + 40));

  // Deplete mag + reserve -> dry_fire + no_heavy_ammo banner
  state.heavy.ammo = 0;
  state.heavy.reserveAmmo = 0;
  const emptyRes = stepWeaponSystem(state, {
    dt: 0.016,
    fireHeld: true,
    fireJustPressed: true,
    reloadJustPressed: false,
    ads: false,
    movingSpeedRatio: 0,
    crouching: false,
  });
  assert.equal(emptyRes.fired, null);
  assert.ok(emptyRes.events.includes('dry_fire'));
  assert.equal(state.bannerKind, 'no_heavy_ammo');
});
