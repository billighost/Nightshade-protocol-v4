import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Floor08TutorialMachine } from './floor08Tutorial';

describe('Floor08TutorialMachine', () => {
  it('progresses cleanly through all 5 steps and triggers entry-gate respawn on completion', () => {
    const tut = new Floor08TutorialMachine();
    assert.equal(tut.active, true);
    assert.equal(tut.stepId, 'move_sprint');

    // Step 1: Move + Sprint
    assert.equal(tut.recordMovement(1.0, false), false);
    assert.equal(tut.recordMovement(0.8, true), true);
    assert.equal(tut.stepId, 'aim_fire_swap');

    // Step 2: ADS + Fire + Weapon Swap
    assert.equal(tut.recordAds(), false);
    assert.equal(tut.recordFire(), false);
    assert.equal(tut.recordWeaponSwap(), true);
    assert.equal(tut.stepId, 'reload_vent');

    // Step 3: Active Reload / Thermal Vent
    assert.equal(tut.recordReloadOrVent(), true);
    assert.equal(tut.stepId, 'jump_roll');

    // Step 4: Jump + Dodge-Roll
    assert.equal(tut.recordJump(), false);
    assert.equal(tut.recordDodgeRoll(), true);
    assert.equal(tut.stepId, 'relay_interact');

    // Step 5: Shoot Security Relay -> completes tutorial & queues entry-gate respawn!
    assert.equal(tut.recordRelayShot(), true);
    assert.equal(tut.active, false);
    assert.equal(tut.stepId, 'completed');
    assert.equal(tut.consumeRespawnPending(), true);
    assert.equal(tut.consumeRespawnPending(), false);
  });

  it('supports instant [Tab] skip and queues entry-gate respawn for live combat', () => {
    const tut = new Floor08TutorialMachine();
    assert.equal(tut.skip(), true);
    assert.equal(tut.active, false);
    assert.equal(tut.skipped, true);
    assert.equal(tut.consumeRespawnPending(), true);
    assert.equal(tut.skip(), false);
  });

  it('fast-chains steps when player already performed later actions ahead of schedule', () => {
    const tut = new Floor08TutorialMachine();
    tut.recordAds();
    tut.recordFire();
    tut.recordWeaponSwap();
    tut.recordReloadOrVent();
    // Completing step 1 auto-advances straight through steps 2 and 3 to jump_roll!
    assert.equal(tut.recordMovement(2.0, true), true);
    assert.equal(tut.stepId, 'jump_roll');
  });
});
