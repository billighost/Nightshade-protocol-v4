import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createFogOfWarGrid,
  resetFogOfWarGrid,
  revealFogAt,
  sampleFogVisibility,
} from './fogOfWar';
import type { MinimapRect } from './minimapMath';

describe('Minimap Fog of War (Dynamic Exploration & Wall LOS Occlusion)', () => {
  it('starts completely obscured and dynamically clears as the player moves without re-obscuring visited rooms', () => {
    const grid = createFogOfWarGrid(-40, 40, -40, 40, 2);
    assert.equal(sampleFogVisibility(grid, 0, 20), 0);
    assert.equal(sampleFogVisibility(grid, 0, -10), 0);

    const v0 = grid.version;
    const changed = revealFogAt(grid, 0, 20, 0, []);
    assert.equal(changed, true);
    assert.ok(grid.version > v0);
    assert.equal(sampleFogVisibility(grid, 0, 20), 1);

    // Move far away: previously visited room MUST stay permanently revealed while new room also clears!
    revealFogAt(grid, 22, -16, 0, []);
    assert.equal(sampleFogVisibility(grid, 0, 20), 1, 'Visited area stays revealed');
    assert.equal(sampleFogVisibility(grid, 22, -16), 1, 'New location becomes revealed');
    assert.equal(sampleFogVisibility(grid, -28, -28), 0, 'Unvisited corner stays obscured');
  });

  it('reveals further ahead along the camera sight-cone than behind the player', () => {
    const grid = createFogOfWarGrid(-40, 40, -40, 40, 2);
    // cameraYaw = 0 faces North (-Z)
    revealFogAt(grid, 0, 0, 0, [], {
      ambientRadius: 8,
      visionConeRange: 20,
      visionHalfAngleRad: 0.65,
    });

    const ahead = sampleFogVisibility(grid, 0, -15);
    const behind = sampleFogVisibility(grid, 0, 15);
    assert.ok(ahead > 0.6, `Expected forward sight-cone cell to be revealed (got ${ahead})`);
    assert.equal(behind, 0, 'Area 15m behind player beyond ambient radius should remain obscured');
  });

  it('blocks fog clearing through solid structural walls so unseen adjacent wings stay shrouded until entered', () => {
    const grid = createFogOfWarGrid(-40, 40, -40, 40, 2);
    // Thick vertical concrete wall at X = -8..-6 spanning Z = -20..20
    const walls: MinimapRect[] = [
      { minX: -8, maxX: -6, minZ: -20, maxZ: 20, kind: 'wall' },
    ];

    // Player stands at (0, 0) looking West (+PI/2) directly toward the wall
    revealFogAt(grid, 0, 0, Math.PI / 2, walls, {
      ambientRadius: 10,
      visionConeRange: 20,
    });

    assert.equal(sampleFogVisibility(grid, -3, 0), 1, 'Room on player side of wall is revealed');
    assert.equal(
      sampleFogVisibility(grid, -14, 0),
      0,
      'Unvisited room hidden behind solid wall remains obscured'
    );

    // Once player enters the room behind the wall, it dynamically clears!
    revealFogAt(grid, -14, 0, 0, walls);
    assert.equal(sampleFogVisibility(grid, -14, 0), 1, 'Room clears immediately once entered');
  });

  it('resets cleanly back to unexplored state on run restart', () => {
    const grid = createFogOfWarGrid(-40, 40, -40, 40, 2);
    revealFogAt(grid, 0, 0, 0, []);
    assert.equal(sampleFogVisibility(grid, 0, 0), 1);

    resetFogOfWarGrid(grid);
    assert.equal(sampleFogVisibility(grid, 0, 0), 0);
  });
});
