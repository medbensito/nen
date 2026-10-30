import { z } from 'zod';
import { attackSchema, compileAttack, type AttackStats } from './attack';
import { idSchema, localeKeySchema } from './common';
import { perSecondToPerTick } from './units';

export const SPECIALIZATIONS = [
  'reinforcement',
  'transmutation',
  'emission',
  'manipulation',
  'conjuration',
  'specialization',
] as const;

/**
 * The game rule a specialization changes, with its parameters. Each kind is
 * a hook in the simulation; a new specialization rule means a new kind here.
 */
const specializationRuleSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    /** Projectiles from this champion's abilities give back a share of the ability cost on hit, once per cast. */
    kind: z.literal('projectile-hit-refund'),
    name: localeKeySchema,
    description: localeKeySchema,
    share: z.number().min(0).max(1),
  }),
]);

/** data/champions/<id>.json — growth per level arrives in M4. */
export const championSchema = z.strictObject({
  id: idSchema,
  name: localeKeySchema,
  /** Body radius, kept clear of walls by the navigation. */
  radius: z.number().positive(),
  /** Units per second. */
  moveSpeed: z.number().positive(),
  health: z.number().positive(),
  armor: z.number().nonnegative(),
  attack: attackSchema,
  /** Max nen. */
  nen: z.number().positive(),
  specialization: z.strictObject({
    type: z.enum(SPECIALIZATIONS),
    rule: specializationRuleSchema,
  }),
  /** Ability ids from data/abilities/, in key order (first ability, second…). */
  abilities: z.array(idSchema).length(4),
});

export type Specialization = (typeof SPECIALIZATIONS)[number];
export type SpecializationRule = z.infer<typeof specializationRuleSchema>;

export type ChampionDef = z.infer<typeof championSchema>;

/** A champion as the simulation uses it: rates are per tick. */
export interface Champion {
  id: string;
  name: string;
  radius: number;
  moveSpeedPerTick: number;
  health: number;
  armor: number;
  attack: AttackStats;
  nen: number;
  specialization: Specialization;
  rule: SpecializationRule;
  abilities: string[];
}

export function compileChampion(def: ChampionDef, tickRate: number): Champion {
  return {
    id: def.id,
    name: def.name,
    radius: def.radius,
    moveSpeedPerTick: perSecondToPerTick(def.moveSpeed, tickRate),
    health: def.health,
    armor: def.armor,
    attack: compileAttack(def.attack, tickRate),
    nen: def.nen,
    specialization: def.specialization.type,
    rule: def.specialization.rule,
    abilities: def.abilities,
  };
}
