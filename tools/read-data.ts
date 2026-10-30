import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { DataValidationError, ROOT_PATH, type DataIssue, type RawDataFiles } from '@nen/sim';

/**
 * Reads every JSON file under `dataDir` into the shape expected by
 * `loadGameData`: relative path with forward slashes → parsed content.
 *
 * @throws DataValidationError listing every file that is not valid JSON.
 */
export function readDataFiles(dataDir: string): RawDataFiles {
  const files: Record<string, unknown> = {};
  const issues: DataIssue[] = [];

  for (const absolutePath of listJsonFiles(dataDir)) {
    const file = relative(dataDir, absolutePath).split(sep).join('/');
    // Some Windows editors save UTF-8 with a byte order mark, which JSON.parse rejects.
    const text = readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
    try {
      files[file] = JSON.parse(text) as unknown;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      issues.push({ file, path: ROOT_PATH, message: `invalid JSON (${reason})` });
    }
  }

  if (issues.length > 0) throw new DataValidationError(issues);
  return files;
}

function listJsonFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...listJsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.json')) found.push(path);
  }
  return found.sort();
}
