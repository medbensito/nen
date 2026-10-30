import { join } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from './paths';

/**
 * Architecture rule 1 (CLAUDE.md): @nen/sim stays pure. These tests lint
 * probe snippets as if they lived in the repository, to prove the guard holds.
 */
const eslint = new ESLint({ cwd: REPO_ROOT });

async function ruleIds(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(REPO_ROOT, file) });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'parse-error');
}

const FORBIDDEN_IN_SIM: [string, string, string][] = [
  ['a Phaser import', "import Phaser from 'phaser';\nexport { Phaser };", 'no-restricted-imports'],
  [
    'a node: import',
    "import { readFileSync } from 'node:fs';\nexport { readFileSync };",
    'no-restricted-imports',
  ],
  ['a bare Node import', "import { join } from 'path';\nexport { join };", 'no-restricted-imports'],
  ['Math.random', 'export const roll = Math.random();', 'no-restricted-properties'],
  ['Date.now', 'export const now = Date.now();', 'no-restricted-properties'],
  ['new Date', 'export const now = new Date();', 'no-restricted-syntax'],
  ['window', 'export const width = window.innerWidth;', 'no-restricted-globals'],
  ['performance', 'export const time = performance.now();', 'no-restricted-globals'],
  ['setTimeout', 'setTimeout(() => undefined, 10);', 'no-restricted-globals'],
];

const SIM_FILES = ['packages/sim/src/lint-probe.ts', 'packages/sim/test/lint-probe.test.ts'];

describe('sim isolation lint rules', () => {
  for (const file of SIM_FILES) {
    it.each(FORBIDDEN_IN_SIM)(`rejects %s in ${file}`, async (_label, code, rule) => {
      expect(await ruleIds(code, file)).toContain(rule);
    });
  }

  it('accepts plain simulation code', async () => {
    const code = 'export const double = (value: number): number => value * 2;';
    expect(await ruleIds(code, 'packages/sim/src/lint-probe.ts')).toEqual([]);
  });

  it('does not restrict the client', async () => {
    const code = [
      "import Phaser from 'phaser';",
      'export const seed = Math.random() + Date.now() + performance.now();',
      'export { Phaser };',
    ].join('\n');
    expect(await ruleIds(code, 'packages/client/src/lint-probe.ts')).toEqual([]);
  });
});
