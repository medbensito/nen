import { z } from 'zod';
import { pointInRect } from '../core/geometry';
import {
  idSchema,
  localeKeySchema,
  PLAYABLE_TEAMS,
  pointSchema,
  rectSchema,
  teamSchema,
} from './common';

const baseSchema = z.strictObject({
  team: teamSchema,
  /** Where the team's champions spawn and respawn. */
  fountain: pointSchema,
  fountainRadius: z.number().positive(),
});

/** data/maps/<id>.json */
export const mapSchema = z.strictObject({
  id: idSchema,
  name: localeKeySchema,
  width: z.number().positive(),
  height: z.number().positive(),
  /** Side of a navigation grid cell. Smaller is more precise and more expensive. */
  navCellSize: z.number().positive(),
  /** Impassable areas, as axis-aligned rectangles. The map edges are impassable too. */
  obstacles: z.array(rectSchema),
  bases: z.array(baseSchema),
});

export type MapDef = z.infer<typeof mapSchema>;

/** Rules a valid map file must follow beyond its shape. */
export function checkMap(map: MapDef, report: (path: string, message: string) => void): void {
  const bounds = { x: 0, y: 0, width: map.width, height: map.height };

  map.obstacles.forEach((obstacle, index) => {
    const inside =
      obstacle.x >= 0 &&
      obstacle.y >= 0 &&
      obstacle.x + obstacle.width <= map.width &&
      obstacle.y + obstacle.height <= map.height;
    if (!inside) report(`obstacles[${index}]`, 'must lie inside the map');
  });

  for (const team of PLAYABLE_TEAMS) {
    const count = map.bases.filter((base) => base.team === team).length;
    if (count !== 1) {
      report('bases', `must contain exactly one base for team "${team}" (found ${count})`);
    }
  }

  map.bases.forEach((base, index) => {
    if (!pointInRect(base.fountain, bounds)) {
      report(`bases[${index}].fountain`, 'must lie inside the map');
    } else if (map.obstacles.some((obstacle) => pointInRect(base.fountain, obstacle))) {
      report(`bases[${index}].fountain`, 'must not lie inside an obstacle');
    }
  });
}
