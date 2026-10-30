import { describe, expect, it } from 'vitest';
import { fnv1a32, hashState, stableStringify } from './hash';

describe('fnv1a32', () => {
  it('matches the reference test vectors', () => {
    expect(fnv1a32('')).toBe('811c9dc5');
    expect(fnv1a32('a')).toBe('e40c292c');
    expect(fnv1a32('foobar')).toBe('bf9cf968');
  });
});

describe('stableStringify', () => {
  it('sorts object keys at every depth', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('keeps array order and drops undefined properties', () => {
    expect(stableStringify({ list: [3, 1, 2], missing: undefined })).toBe('{"list":[3,1,2]}');
  });
});

describe('hashState', () => {
  it('ignores property creation order', () => {
    expect(hashState({ x: 1, y: [1, 2] })).toBe(hashState({ y: [1, 2], x: 1 }));
  });

  it('changes when any value changes', () => {
    expect(hashState({ x: 1, y: [1, 2] })).not.toBe(hashState({ x: 1, y: [1, 3] }));
  });
});
