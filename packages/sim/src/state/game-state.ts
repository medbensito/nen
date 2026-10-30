import { createRngState, type RngState } from '../core/rng';
import type { DeepReadonly } from '../core/types';
import type { Vec2 } from '../core/vec2';

export type EntityId = number;
export type PlayerId = number;
export type ProjectileId = number;
export type Team = 'blue' | 'red' | 'neutral';

export interface Movement {
  /** World units per tick. */
  speed: number;
  /** Waypoints still to reach, in order. Empty when the entity stands still. */
  path: Vec2[];
}

export interface Health {
  current: number;
  max: number;
}

/** Basic attack: stats copied from the definition, plus the attack in progress. */
export interface Attack {
  damage: number;
  range: number;
  periodTicks: number;
  windupTicks: number;
  /** 0: the hit lands at the end of the wind-up, without projectile. */
  projectileSpeed: number;
  projectileRadius: number;
  /** Entity this attacker is ordered to attack, or null. */
  target: EntityId | null;
  /** Ticks before a new attack may start. */
  cooldownTicks: number;
  /** Ticks left in the current wind-up; 0 when not winding up. */
  windupLeft: number;
  /** Next tick at which a chasing attacker recomputes its path. */
  repathTick: number;
}

export interface Respawn {
  /** Where the entity comes back to life. */
  home: Vec2;
  delayTicks: number;
}

export interface Nen {
  current: number;
  max: number;
  /** Set when spending empties the gauge; abilities are blocked until it refills enough. */
  exhausted: boolean;
}

export interface AbilitySlot {
  abilityId: string;
  cooldownTicks: number;
}

/** Standing still before a channelled ability fires. */
export interface Channel {
  slot: number;
  /** Unit vector the ability will fire along. */
  direction: Vec2;
  releaseTick: number;
}

export interface Dash {
  /** Unit vector. */
  direction: Vec2;
  /** World units per tick. */
  speed: number;
  /** Distance still to cover. */
  remaining: number;
}

/** Summoned orb shooting enemies on its own. */
export interface Turret {
  casterId: EntityId;
  untilTick: number;
  intervalTicks: number;
  nextShotTick: number;
  acquisitionRange: number;
  shotDamage: number;
  shotSpeed: number;
  shotRadius: number;
  /** Nen the caster gets back on the first shot that hits, then 0. */
  refund: number;
}

/** The specialization rule this entity plays by, with its parameters. */
export interface SpecializationRuleState {
  kind: 'projectile-hit-refund';
  share: number;
}

/** Strikes back at the last attacker for a while, without ever chasing. */
export interface Retaliation {
  durationTicks: number;
  targetId: EntityId | null;
  untilTick: number;
}

/**
 * An entity is plain data; optional components say what it can do. An entity
 * with `health` can be attacked; `deadUntil` is set while it is dead.
 */
export interface Entity {
  id: EntityId;
  kind: string;
  /** Id of its definition in data/ (champion or unit id). */
  defId: string;
  team: Team;
  position: Vec2;
  /** Body radius, in world units. */
  radius: number;
  movement?: Movement;
  health?: Health;
  armor?: number;
  attack?: Attack;
  respawn?: Respawn;
  retaliation?: Retaliation;
  nen?: Nen;
  /** Until this tick, the entity counts as in combat (it dealt or took damage from an enemy). */
  combatUntil?: number;
  abilities?: AbilitySlot[];
  channel?: Channel;
  dash?: Dash;
  turret?: Turret;
  specializationRule?: SpecializationRuleState;
  /** Tick at which a dead entity respawns (or is removed, without `respawn`). */
  deadUntil?: number;
}

interface ProjectileBase {
  id: ProjectileId;
  /** Who gets the credit: damage source, refunds, retaliation. */
  sourceId: EntityId;
  team: Team;
  position: Vec2;
  /** World units per tick. */
  speed: number;
  radius: number;
  damage: number;
  /** Nen given back to the source on hit (specialization rule). */
  refundAmount: number;
  /** For orb shots: the orb whose one-time refund this hit may claim. */
  refundTurretId: EntityId | null;
}

/** Follows its target and always hits, unless the target dies first. */
export interface HomingProjectile extends ProjectileBase {
  kind: 'homing';
  targetId: EntityId;
}

/** Flies straight and stops at the first enemy it touches, or after its range. */
export interface SkillshotProjectile extends ProjectileBase {
  kind: 'skillshot';
  /** Unit vector. */
  direction: Vec2;
  remaining: number;
}

export type Projectile = HomingProjectile | SkillshotProjectile;

export interface Player {
  id: PlayerId;
  team: Team;
  /** The champion this player controls. */
  entityId: EntityId;
}

/**
 * The whole game, as plain JSON-serializable data. Snapshots, hashes and,
 * later, network sync all rely on that.
 */
export interface GameState {
  tick: number;
  /** Shared by every system through the tick context. Never replace this object. */
  rng: RngState;
  nextEntityId: EntityId;
  nextProjectileId: ProjectileId;
  players: Player[];
  /** Always sorted by id: ids only grow, and systems iterate in this order. */
  entities: Entity[];
  /** In launch order. */
  projectiles: Projectile[];
}

export function createGameState(seed: number): GameState {
  return {
    tick: 0,
    rng: createRngState(seed),
    nextEntityId: 1,
    nextProjectileId: 1,
    players: [],
    entities: [],
    projectiles: [],
  };
}

export function spawnEntity(state: GameState, init: Omit<Entity, 'id'>): Entity {
  // Deep copy through JSON: state is JSON data by design, and the caller's
  // objects must never alias it.
  const entity = JSON.parse(JSON.stringify({ ...init, id: state.nextEntityId })) as Entity;
  state.nextEntityId += 1;
  state.entities.push(entity);
  return entity;
}

export function findEntity(state: GameState, id: EntityId): Entity | undefined {
  const index = indexOfEntity(state, id);
  return index === -1 ? undefined : state.entities[index];
}

export function removeEntity(state: GameState, id: EntityId): boolean {
  const index = indexOfEntity(state, id);
  if (index === -1) return false;
  state.entities.splice(index, 1);
  return true;
}

/** Alive: can be targeted, acts, and takes part in the game. */
export function isAlive(entity: DeepReadonly<Entity>): boolean {
  return entity.health !== undefined && entity.deadUntil === undefined;
}

export function isHostile(a: DeepReadonly<Entity>, b: DeepReadonly<Entity>): boolean {
  return a.team !== b.team;
}

function indexOfEntity(state: GameState, id: EntityId): number {
  const { entities } = state;
  let low = 0;
  let high = entities.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const middleId = entities[middle]?.id ?? 0;
    if (middleId === id) return middle;
    if (middleId < id) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}
