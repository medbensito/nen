import type { DeepReadonly } from '../core/types';
import type { MapDef } from '../schema/map';
import { buildNavGrid, type NavGrid } from './nav-grid';

/** Navigation grids of the current map, one per agent radius, built on first use. */
export interface NavIndex {
  readonly map: DeepReadonly<MapDef>;
  gridFor(clearance: number): NavGrid;
}

export function createNavIndex(map: DeepReadonly<MapDef>): NavIndex {
  const grids = new Map<number, NavGrid>();
  return {
    map,
    gridFor(clearance) {
      let grid = grids.get(clearance);
      if (!grid) {
        grid = buildNavGrid(map, clearance);
        grids.set(clearance, grid);
      }
      return grid;
    },
  };
}
