import type { SimEvent } from '../../src/core/events';
import { createSimulation, type Simulation } from '../../src/core/simulation';
import type { DeepReadonly } from '../../src/core/types';
import type { Entity, EntityId } from '../../src/state/game-state';
import { fixtureGameData, type FixtureFiles } from './game-data';

export interface TestSim {
  readonly sim: Simulation;
  readonly championId: EntityId;
  /** First unit placed by the map: the test dummy. */
  readonly dummyId: EntityId;
  entity(id: EntityId): DeepReadonly<Entity>;
  champion(): DeepReadonly<Entity>;
  dummy(): DeepReadonly<Entity>;
  /** Steps `ticks` times and returns every event, in order. */
  run(ticks: number): SimEvent[];
}

/** Simulation over the fixture data, optionally edited (see fixtures/game-data.ts). */
export function createTestSim(edit?: (files: FixtureFiles) => void): TestSim {
  const sim = createSimulation({ data: fixtureGameData(edit), seed: 1 });
  const championId = sim.state.players[0]?.entityId ?? -1;
  const dummyId = sim.state.entities.find((entity) => entity.kind === 'unit')?.id ?? -1;

  const entity = (id: EntityId) => {
    const found = sim.state.entities.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`entity ${id} not found`);
    return found;
  };

  return {
    sim,
    championId,
    dummyId,
    entity,
    champion: () => entity(championId),
    dummy: () => entity(dummyId),
    run(ticks) {
      const events: SimEvent[] = [];
      for (let i = 0; i < ticks; i++) {
        sim.step();
        events.push(...sim.events);
      }
      return events;
    },
  };
}

/** Edits one field group of a fixture file. */
export function patch(files: FixtureFiles, file: string, fields: Record<string, unknown>): void {
  files[file] = { ...files[file], ...fields };
}

/** Moves the test dummy; the default (300, 80) is out of the champion's range. */
export function placeDummy(files: FixtureFiles, position: { x: number; y: number }): void {
  patch(files, 'maps/test-arena.json', {
    units: [{ unit: 'test-dummy', team: 'red', position }],
  });
}
