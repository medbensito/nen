import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const PURE_SIM =
  '@nen/sim must stay pure: no rendering, browser or Node APIs (CLAUDE.md, architecture rule 1).';
const USE_TICKS = 'Time is counted in ticks in @nen/sim (CLAUDE.md, architecture rule 1).';
const USE_RNG = 'Use the seeded rng from the tick context (CLAUDE.md, architecture rule 1).';

const NODE_BUILTINS = [
  'assert',
  'buffer',
  'child_process',
  'crypto',
  'events',
  'fs',
  'os',
  'path',
  'process',
  'stream',
  'url',
  'util',
  'worker_threads',
];

const BROWSER_AND_RUNTIME_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'fetch',
  'performance',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'queueMicrotask',
  'process',
  'global',
];

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    files: ['**/*.js', '**/*.mjs', 'tools/**/*.ts', '*.config.ts', 'packages/*/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/client/src/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['packages/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: NODE_BUILTINS.map((name) => ({ name, message: PURE_SIM })),
          patterns: [
            { group: ['phaser', 'phaser/*'], message: PURE_SIM },
            { group: ['node:*'], message: PURE_SIM },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...BROWSER_AND_RUNTIME_GLOBALS.map((name) => ({ name, message: PURE_SIM })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: USE_RNG },
        { object: 'Date', property: 'now', message: USE_TICKS },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date']", message: USE_TICKS },
      ],
    },
  },
  prettier,
);
