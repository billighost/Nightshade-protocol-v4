import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDevFloorWarpKey, resolveWeaponHotkey } from './inputController';

test('Dev shortcut Ctrl + 1..8 resolves exact Floor 01..08 (both Digit & Numpad)', () => {
  for (let floor = 1; floor <= 8; floor++) {
    assert.equal(resolveDevFloorWarpKey(`Digit${floor}`, true), floor);
    assert.equal(resolveDevFloorWarpKey(`Numpad${floor}`, true), floor);
    assert.equal(resolveDevFloorWarpKey(`Digit${floor}`, false), null);
    assert.equal(resolveDevFloorWarpKey(`Numpad${floor}`, false), null);
  }
  assert.equal(resolveDevFloorWarpKey('Digit0', true), null);
  assert.equal(resolveDevFloorWarpKey('Digit9', true), null);
  assert.equal(resolveDevFloorWarpKey('KeyW', true), null);
});

test('Weapon hotkeys 1..3 work normally and are suppressed while Ctrl is held', () => {
  assert.equal(resolveWeaponHotkey('Digit1', false), 'pistol');
  assert.equal(resolveWeaponHotkey('Digit2', false), 'smg');
  assert.equal(resolveWeaponHotkey('Digit3', false), 'heavy');
  assert.equal(resolveWeaponHotkey('Digit4', false), null);

  // Ctrl + 1..3 must NOT trigger weapon switch while warping to Floors 01..03!
  assert.equal(resolveWeaponHotkey('Digit1', true), null);
  assert.equal(resolveWeaponHotkey('Digit2', true), null);
  assert.equal(resolveWeaponHotkey('Digit3', true), null);
});
