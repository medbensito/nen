import { z } from 'zod';
import { idSchema, localeKeySchema } from './common';
import { perSecondToPerTick, secondsToTicks } from './units';

/** Nen cost: a fixed amount, or everything left (with a minimum to start). */
const costSchema = z.union([
  z.number().nonnegative(),
  z.strictObject({ allRemaining: z.literal(true), minimum: z.number().positive() }),
]);

/** Projectile flying in a straight line; stops at the first enemy it touches. */
const skillshotEffectSchema = z.strictObject({
  type: z.literal('skillshot'),
  damage: z.number().positive(),
  /** Distance it travels before vanishing. */
  range: z.number().positive(),
  speed: z.number().positive(),
  radius: z.number().positive(),
});

/** Quick move toward the cursor; stops early against a wall. */
const dashEffectSchema = z.strictObject({
  type: z.literal('dash'),
  distance: z.number().positive(),
  speed: z.number().positive(),
});

/** Summoned orb that shoots the nearest enemy on its own for a while. */
const turretEffectSchema = z.strictObject({
  type: z.literal('turret'),
  /** Farthest point from the caster where the orb can be placed. */
  placementRange: z.number().positive(),
  radius: z.number().positive(),
  duration: z.number().positive(),
  /** Seconds between two shots. */
  interval: z.number().positive(),
  /** Edge-to-edge reach of its shots. */
  acquisitionRange: z.number().positive(),
  shot: z.strictObject({
    damage: z.number().positive(),
    speed: z.number().positive(),
    radius: z.number().positive(),
  }),
});

/** Channelled straight beam hitting every enemy along it; damage grows with the nen spent. */
const beamEffectSchema = z.strictObject({
  type: z.literal('beam'),
  /** Seconds standing still before the beam fires. A move order cancels it at no cost. */
  channel: z.number().positive(),
  length: z.number().positive(),
  width: z.number().positive(),
  baseDamage: z.number().nonnegative(),
  damagePerNen: z.number().nonnegative(),
});

/** data/abilities/<id>.json */
export const abilitySchema = z.strictObject({
  id: idSchema,
  name: localeKeySchema,
  description: localeKeySchema,
  cost: costSchema,
  /** Seconds. */
  cooldown: z.number().nonnegative(),
  /** Champion level from which the ability can be cast. */
  unlockLevel: z.int().min(1),
  effect: z.discriminatedUnion('type', [
    skillshotEffectSchema,
    dashEffectSchema,
    turretEffectSchema,
    beamEffectSchema,
  ]),
});

export type AbilityDef = z.infer<typeof abilitySchema>;

export type AbilityCost = { kind: 'fixed'; amount: number } | { kind: 'all'; minimum: number };

/** Effects as the simulation uses them: durations in ticks, speeds per tick. */
export type AbilityEffect =
  | { type: 'skillshot'; damage: number; range: number; speed: number; radius: number }
  | { type: 'dash'; distance: number; speed: number }
  | {
      type: 'turret';
      placementRange: number;
      radius: number;
      durationTicks: number;
      intervalTicks: number;
      acquisitionRange: number;
      shot: { damage: number; speed: number; radius: number };
    }
  | {
      type: 'beam';
      channelTicks: number;
      length: number;
      width: number;
      baseDamage: number;
      damagePerNen: number;
    };

export interface Ability {
  id: string;
  name: string;
  description: string;
  cost: AbilityCost;
  cooldownTicks: number;
  unlockLevel: number;
  effect: AbilityEffect;
}

export function compileAbility(def: AbilityDef, tickRate: number): Ability {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    cost:
      typeof def.cost === 'number'
        ? { kind: 'fixed', amount: def.cost }
        : { kind: 'all', minimum: def.cost.minimum },
    cooldownTicks: secondsToTicks(def.cooldown, tickRate),
    unlockLevel: def.unlockLevel,
    effect: compileEffect(def.effect, tickRate),
  };
}

function compileEffect(effect: AbilityDef['effect'], tickRate: number): AbilityEffect {
  const perTick = (value: number) => perSecondToPerTick(value, tickRate);
  switch (effect.type) {
    case 'skillshot':
      return { ...effect, speed: perTick(effect.speed) };
    case 'dash':
      return { ...effect, speed: perTick(effect.speed) };
    case 'turret':
      return {
        type: 'turret',
        placementRange: effect.placementRange,
        radius: effect.radius,
        durationTicks: secondsToTicks(effect.duration, tickRate),
        intervalTicks: Math.max(1, secondsToTicks(effect.interval, tickRate)),
        acquisitionRange: effect.acquisitionRange,
        shot: { ...effect.shot, speed: perTick(effect.shot.speed) },
      };
    case 'beam':
      return {
        type: 'beam',
        channelTicks: Math.max(1, secondsToTicks(effect.channel, tickRate)),
        length: effect.length,
        width: effect.width,
        baseDamage: effect.baseDamage,
        damagePerNen: effect.damagePerNen,
      };
  }
}
