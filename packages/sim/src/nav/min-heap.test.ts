import { describe, expect, it } from 'vitest';
import { createRng, createRngState } from '../core/rng';
import { MinHeap } from './min-heap';

describe('MinHeap', () => {
  it('pops nodes by primary, then secondary, then node value', () => {
    const heap = new MinHeap();
    heap.push(5, 2, 0);
    heap.push(3, 1, 9);
    heap.push(4, 1, 1);
    heap.push(1, 1, 1);
    expect([heap.pop(), heap.pop(), heap.pop(), heap.pop(), heap.pop()]).toEqual([
      1,
      4,
      3,
      5,
      undefined,
    ]);
  });

  it('sorts random input', () => {
    const rng = createRng(createRngState(5));
    const heap = new MinHeap();
    const values = Array.from({ length: 500 }, () => rng.int(0, 10_000));
    values.forEach((value, index) => heap.push(index, value, 0));

    const popped: number[] = [];
    while (heap.size > 0) popped.push(values[heap.pop() ?? 0] ?? -1);
    expect(popped).toEqual([...values].sort((a, b) => a - b));
  });
});
