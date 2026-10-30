import { loadGameData, type GameData } from '../../src/schema/loader';

export type FixtureFiles = Record<string, Record<string, unknown>>;

/**
 * Minimal raw data for rule tests. Independent from data/ on purpose:
 * rebalancing the game must never break a rule test.
 *
 * Test arena: 800 × 600, a 100 × 300 wall in the middle, one fountain per side.
 * Test champion: radius 30, 300 units per second (10 per tick at 30 ticks/s),
 *   500 health, no armor; ranged attack: 50 damage, 1 per second (30 ticks,
 *   15 of wind-up), range 200, projectile 600 units/s (20 per tick).
 * Test dummy (red) at (300, 80): radius 40, 300 health, 50 armor (takes 2/3
 *   of raw damage); instant attack 30 damage, 1 per second, range 250;
 *   respawns after 2 s, retaliates for 3 s.
 * Combat: armor scale 100; champion respawn 2 s + 1 s per level; no fountain
 *   regeneration unless a test turns it on.
 * Nen: 200 max; in combat for 60 ticks after damage; 1 nen per tick out of
 *   combat, none in combat; exhausted at 0 (×1.5 damage taken) until 50.
 * Abilities (rule: hits refund 25 % of the cost, once per cast):
 *   test-shot  30 nen, 30-tick cooldown, skillshot 60 damage, 400 range, 20/tick, radius 10
 *   test-dash  20 nen, 60-tick cooldown, 200 units at 40/tick
 *   test-orb   50 nen, 90-tick cooldown, orb within 300, lives 60 ticks, shoots
 *              every 15 ticks at 250 range, 15 damage, 30/tick
 *   test-beam  all nen (60 minimum), 300-tick cooldown, 30-tick channel,
 *              500 × 100 beam, 100 + 1 per nen spent
 */
export function fixtureFiles(): FixtureFiles {
  return {
    'rules/simulation.json': { tickRate: 30, maxStepsPerFrame: 5 },
    'rules/match.json': { map: 'test-arena', champion: 'test-champion', team: 'blue' },
    'rules/combat.json': {
      armorScale: 100,
      respawn: { base: 2, perLevel: 1 },
      // Off by default: the champion spawns in its fountain, which would heal
      // it during rule tests. Fountain tests turn it on.
      fountainRegen: 0,
    },
    'rules/nen.json': {
      combatDuration: 2,
      regen: { outOfCombat: 30, inCombat: 0 },
      exhaustion: { damageTakenMultiplier: 1.5, recoverAt: 0.25 },
    },
    'input/bindings.json': {
      keys: {
        ability1: 'KeyQ',
        ability2: 'KeyW',
        ability3: 'KeyE',
        ability4: 'KeyR',
        stop: 'KeyS',
        toggleCameraLock: 'KeyY',
        centerCamera: 'Space',
      },
      moveRepeatInterval: 0.15,
    },
    'input/camera.json': {
      startLocked: true,
      edgeScrollMargin: 20,
      edgeScrollSpeed: 1000,
      zoom: { initial: 1, min: 0.5, max: 2, step: 0.1 },
    },
    'maps/test-arena.json': {
      id: 'test-arena',
      name: 'map.test-arena.name',
      width: 800,
      height: 600,
      navCellSize: 25,
      obstacles: [{ x: 350, y: 150, width: 100, height: 300 }],
      bases: [
        { team: 'blue', fountain: { x: 60, y: 300 }, fountainRadius: 40 },
        { team: 'red', fountain: { x: 740, y: 300 }, fountainRadius: 40 },
      ],
      units: [{ unit: 'test-dummy', team: 'red', position: { x: 300, y: 80 } }],
    },
    'champions/test-champion.json': {
      id: 'test-champion',
      name: 'champion.test-champion.name',
      radius: 30,
      moveSpeed: 300,
      health: 500,
      armor: 0,
      attack: {
        damage: 50,
        perSecond: 1,
        range: 200,
        windup: 0.5,
        projectile: { speed: 600, radius: 5 },
      },
      nen: 200,
      specialization: {
        type: 'emission',
        rule: {
          kind: 'projectile-hit-refund',
          name: 'rule.test-refund.name',
          description: 'rule.test-refund.description',
          share: 0.25,
        },
      },
      abilities: ['test-shot', 'test-dash', 'test-orb', 'test-beam'],
    },
    'units/test-dummy.json': {
      id: 'test-dummy',
      name: 'unit.test-dummy.name',
      radius: 40,
      health: 300,
      armor: 50,
      attack: { damage: 30, perSecond: 1, range: 250, windup: 0 },
      respawnTime: 2,
      retaliation: { duration: 3 },
    },
    'abilities/test-shot.json': {
      id: 'test-shot',
      name: 'ability.test-shot.name',
      description: 'ability.test-shot.description',
      cost: 30,
      cooldown: 1,
      unlockLevel: 1,
      effect: { type: 'skillshot', damage: 60, range: 400, speed: 600, radius: 10 },
    },
    'abilities/test-dash.json': {
      id: 'test-dash',
      name: 'ability.test-dash.name',
      description: 'ability.test-dash.description',
      cost: 20,
      cooldown: 2,
      unlockLevel: 1,
      effect: { type: 'dash', distance: 200, speed: 1200 },
    },
    'abilities/test-orb.json': {
      id: 'test-orb',
      name: 'ability.test-orb.name',
      description: 'ability.test-orb.description',
      cost: 50,
      cooldown: 3,
      unlockLevel: 1,
      effect: {
        type: 'turret',
        placementRange: 300,
        radius: 12,
        duration: 2,
        interval: 0.5,
        acquisitionRange: 250,
        shot: { damage: 15, speed: 900, radius: 5 },
      },
    },
    'abilities/test-beam.json': {
      id: 'test-beam',
      name: 'ability.test-beam.name',
      description: 'ability.test-beam.description',
      cost: { allRemaining: true, minimum: 60 },
      cooldown: 10,
      unlockLevel: 1,
      effect: {
        type: 'beam',
        channel: 1,
        length: 500,
        width: 100,
        baseDamage: 100,
        damagePerNen: 1,
      },
    },
    'locales/fr.json': {
      'map.test-arena.name': 'Arène de test',
      'champion.test-champion.name': 'Champion de test',
      'unit.test-dummy.name': 'Mannequin de test',
      'specialization.emission.name': 'Émission',
      'rule.test-refund.name': 'Remboursement de test',
      'rule.test-refund.description': 'Rend une part du coût.',
      'ability.test-shot.name': 'Tir',
      'ability.test-shot.description': 'Tir en ligne droite.',
      'ability.test-dash.name': 'Dash',
      'ability.test-dash.description': 'Déplacement rapide.',
      'ability.test-orb.name': 'Orbe',
      'ability.test-orb.description': 'Orbe qui tire seul.',
      'ability.test-beam.name': 'Rayon',
      'ability.test-beam.description': 'Rayon canalisé.',
    },
  };
}

/** Loads the fixture data, optionally edited first (e.g. to change one stat). */
export function fixtureGameData(edit?: (files: FixtureFiles) => void): GameData {
  const files = fixtureFiles();
  edit?.(files);
  return loadGameData(files);
}
