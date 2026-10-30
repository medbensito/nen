import { describe, expect, it } from 'vitest';
import { fixtureGameData } from '../../test/fixtures/game-data';
import { isClear } from '../nav/nav-grid';
import { createSimulation, type Simulation } from '../core/simulation';
import { distance, type Vec2 } from '../core/vec2';

// Fixture: champion of radius 30 moving 300 units/s (10 per tick), spawning at
// the blue fountain (60, 300); a wall stands at x 350..450, y 150..450.

function setup(edit?: Parameters<typeof fixtureGameData>[0]) {
  const sim = createSimulation({ data: fixtureGameData(edit), seed: 1 });
  const championId = sim.state.players[0]?.entityId ?? -1;
  const champion = () => {
    const entity = sim.state.entities.find((candidate) => candidate.id === championId);
    if (!entity) throw new Error('champion missing');
    return entity;
  };
  return { sim, championId, champion };
}

function run(sim: Simulation, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step();
}

describe('match setup', () => {
  it('spawns the player champion at its team fountain', () => {
    const { sim, champion } = setup();
    expect(sim.state.players).toEqual([{ id: 1, team: 'blue', entityId: champion().id }]);
    expect(champion()).toMatchObject({
      kind: 'champion',
      team: 'blue',
      position: { x: 60, y: 300 },
    });
  });
});

describe('move command', () => {
  it('moves at the champion speed and stops exactly on the target', () => {
    const { sim, championId, champion } = setup();
    sim.enqueue({ type: 'move', entityId: championId, target: { x: 60, y: 500 } });

    run(sim, 10);
    expect(champion().position).toEqual({ x: 60, y: 400 });
    run(sim, 10);
    expect(champion().position).toEqual({ x: 60, y: 500 });
    expect(champion().movement?.path).toEqual([]);
    run(sim, 5);
    expect(champion().position).toEqual({ x: 60, y: 500 });
  });

  it('reads the speed from the champion data', () => {
    const covered = (moveSpeed: number) => {
      const { sim, championId, champion } = setup((files) => {
        files['champions/test-champion.json'] = {
          ...files['champions/test-champion.json'],
          moveSpeed,
        };
      });
      sim.enqueue({ type: 'move', entityId: championId, target: { x: 60, y: 560 } });
      run(sim, 15); // half a second at 30 ticks per second
      return distance(champion().position, { x: 60, y: 300 });
    };
    expect(covered(300)).toBeCloseTo(150, 6);
    expect(covered(150)).toBeCloseTo(75, 6);
  });

  it('walks around the wall and keeps its speed through the turns', () => {
    const { sim, championId, champion } = setup();
    const target = { x: 740, y: 300 };
    sim.enqueue({ type: 'move', entityId: championId, target });
    sim.step();

    const waypoints = [...(champion().movement?.path ?? [])] as Vec2[];
    let length = distance({ x: 60, y: 300 }, waypoints[0] ?? target);
    for (let i = 1; i < waypoints.length; i++) {
      length += distance(waypoints[i - 1] ?? target, waypoints[i] ?? target);
    }
    expect(waypoints.length).toBeGreaterThan(1);

    run(sim, Math.ceil(length / 10) - 1);
    expect(champion().position).toEqual(target);
  });

  it('goes to the nearest walkable point when the target is in a wall', () => {
    const { sim, championId, champion } = setup();
    sim.enqueue({ type: 'move', entityId: championId, target: { x: 360, y: 300 } });
    run(sim, 200);

    const data = fixtureGameData();
    const map = data.maps['test-arena'];
    if (!map) throw new Error('map missing');
    expect(isClear(map, champion().position, 30)).toBe(true);
    expect(distance(champion().position, { x: 360, y: 300 })).toBeLessThan(30 + 25);
  });

  it('ignores a target that cannot be reached or is not a number', () => {
    const { sim, championId, champion } = setup((files) => {
      const map = files['maps/test-arena.json'] ?? {};
      files['maps/test-arena.json'] = {
        ...map,
        obstacles: [
          { x: 500, y: 200, width: 200, height: 20 },
          { x: 500, y: 380, width: 200, height: 20 },
          { x: 500, y: 200, width: 20, height: 200 },
          { x: 680, y: 200, width: 20, height: 200 },
        ],
      };
    });
    sim.enqueue({ type: 'move', entityId: championId, target: { x: 60, y: 500 } });
    sim.step();
    sim.enqueue({ type: 'move', entityId: championId, target: { x: 600, y: 300 } });
    sim.enqueue({ type: 'move', entityId: championId, target: { x: Number.NaN, y: 0 } });
    run(sim, 30);

    expect(champion().position).toEqual({ x: 60, y: 500 });
  });

  it('ignores commands for unknown entities', () => {
    const { sim } = setup();
    sim.enqueue({ type: 'move', entityId: 999, target: { x: 100, y: 100 } });
    sim.enqueue({ type: 'stop', entityId: 999 });
    expect(() => sim.step()).not.toThrow();
  });
});

describe('stop command', () => {
  it('stands the champion still where it is', () => {
    const { sim, championId, champion } = setup();
    sim.enqueue({ type: 'move', entityId: championId, target: { x: 60, y: 500 } });
    run(sim, 5);
    sim.enqueue({ type: 'stop', entityId: championId });
    run(sim, 20);

    expect(champion().position).toEqual({ x: 60, y: 350 });
    expect(champion().movement?.path).toEqual([]);
  });
});
