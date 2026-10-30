import { describe, expect, it } from 'vitest';
import { distanceToRect } from '../src/core/geometry';
import { createRng, createRngState } from '../src/core/rng';
import { createSimulation } from '../src/core/simulation';
import { distance } from '../src/core/vec2';
import { fixtureGameData } from './fixtures/game-data';

const MOVES = 1000;
const TICKS_PER_MOVE = 15;

describe('1000 random moves', () => {
  it('never take the champion through a wall or off the map', () => {
    const data = fixtureGameData();
    const map = data.maps['test-arena'];
    const champion = data.champions['test-champion'];
    if (!map || !champion) throw new Error('fixture incomplete');

    // Inflated walls guarantee the center stays this far from any wall: the
    // radius, minus half a cell diagonal (points inside a walkable cell).
    const minClearance = champion.radius - (map.navCellSize * Math.SQRT2) / 2;

    const sim = createSimulation({ data, seed: 7 });
    const entityId = sim.state.players[0]?.entityId ?? -1;
    const entity = sim.state.entities.find((candidate) => candidate.id === entityId);
    if (!entity) throw new Error('champion missing');

    // Targets come from their own seeded generator, outside the simulation.
    const targets = createRng(createRngState(2026));
    const violations: string[] = [];
    let travelled = 0;
    let previous = { ...entity.position };

    for (let move = 0; move < MOVES; move++) {
      sim.enqueue({
        type: 'move',
        entityId,
        target: { x: targets.range(-50, map.width + 50), y: targets.range(-50, map.height + 50) },
      });
      for (let tick = 0; tick < TICKS_PER_MOVE; tick++) {
        sim.step();
        const { x, y } = entity.position;
        travelled += distance(previous, entity.position);
        previous = { x, y };

        if (
          x < minClearance ||
          y < minClearance ||
          x > map.width - minClearance ||
          y > map.height - minClearance
        ) {
          violations.push(`tick ${sim.state.tick}: off the map at (${x}, ${y})`);
        }
        for (const wall of map.obstacles) {
          if (distanceToRect(entity.position, wall) < minClearance) {
            violations.push(`tick ${sim.state.tick}: into a wall at (${x}, ${y})`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
    // The champion really moved around: most ticks were spent walking.
    expect(travelled).toBeGreaterThan(MOVES * TICKS_PER_MOVE * champion.moveSpeedPerTick * 0.5);
  });
});
