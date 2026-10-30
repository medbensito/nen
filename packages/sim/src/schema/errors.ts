/** Path shown when a problem concerns a whole file rather than one field. */
export const ROOT_PATH = '(root)';

export interface DataIssue {
  /** Path of the file relative to data/, with forward slashes, e.g. `rules/simulation.json`. */
  readonly file: string;
  /** Path of the field inside the file, e.g. `abilities[0].cost`, or `(root)`. */
  readonly path: string;
  readonly message: string;
}

export class DataValidationError extends Error {
  readonly issues: readonly DataIssue[];

  constructor(issues: readonly DataIssue[]) {
    super(formatIssues(issues));
    this.name = 'DataValidationError';
    this.issues = issues;
  }
}

export function formatIssues(issues: readonly DataIssue[]): string {
  const plural = issues.length === 1 ? 'issue' : 'issues';
  const lines = issues.map((issue) => `  - ${issue.file} › ${issue.path}: ${issue.message}`);
  return [`Invalid game data (${issues.length} ${plural}):`, ...lines].join('\n');
}

/** `['abilities', 0, 'cost']` → `abilities[0].cost` */
export function formatIssuePath(path: readonly PropertyKey[]): string {
  let out = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`;
    } else {
      const name = String(segment);
      out += out === '' ? name : `.${name}`;
    }
  }
  return out === '' ? ROOT_PATH : out;
}
