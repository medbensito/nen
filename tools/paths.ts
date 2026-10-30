import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DATA_DIR = fileURLToPath(new URL('../data', import.meta.url));
