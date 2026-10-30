/**
 * Stable hash of any JSON-serializable value.
 *
 * Object keys are sorted before hashing, so two states that hold the same data
 * hash the same whatever the order their properties were created in. Used by
 * the determinism tests and, later, to detect client/server divergence.
 */
export function hashState(value: unknown): string {
  return fnv1a32(stableStringify(value));
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    // JSON.stringify returns undefined for undefined, functions and symbols.
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

/** FNV-1a, 32 bits, over UTF-16 code units. Returns 8 hex characters. */
export function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
