/**
 * Validates every file of data/ against its schema.
 * Usage: pnpm validate:data
 */
import { DataValidationError, loadGameData } from '@nen/sim';
import { DATA_DIR } from './paths';
import { readDataFiles } from './read-data';

try {
  const files = readDataFiles(DATA_DIR);
  loadGameData(files);
  console.log(`ok   ${Object.keys(files).length} data files valid`);
} catch (error) {
  if (!(error instanceof DataValidationError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
}
