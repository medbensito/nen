/**
 * Binary min-heap of integer nodes ordered by (primary, secondary, node).
 * The full ordering keeps pathfinding deterministic when costs tie.
 */
export class MinHeap {
  private readonly nodes: number[] = [];
  private readonly primary: number[] = [];
  private readonly secondary: number[] = [];

  get size(): number {
    return this.nodes.length;
  }

  push(node: number, primary: number, secondary: number): void {
    this.nodes.push(node);
    this.primary.push(primary);
    this.secondary.push(secondary);
    this.siftUp(this.nodes.length - 1);
  }

  pop(): number | undefined {
    const top = this.nodes[0];
    const last = this.nodes.length - 1;
    if (last < 0) return undefined;
    this.swap(0, last);
    this.nodes.pop();
    this.primary.pop();
    this.secondary.pop();
    this.siftDown(0);
    return top;
  }

  private less(a: number, b: number): boolean {
    const pa = this.primary[a] ?? 0;
    const pb = this.primary[b] ?? 0;
    if (pa !== pb) return pa < pb;
    const sa = this.secondary[a] ?? 0;
    const sb = this.secondary[b] ?? 0;
    if (sa !== sb) return sa < sb;
    return (this.nodes[a] ?? 0) < (this.nodes[b] ?? 0);
  }

  private siftUp(index: number): void {
    let child = index;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (!this.less(child, parent)) return;
      this.swap(child, parent);
      child = parent;
    }
  }

  private siftDown(index: number): void {
    let parent = index;
    const length = this.nodes.length;
    for (;;) {
      const left = parent * 2 + 1;
      const right = left + 1;
      let smallest = parent;
      if (left < length && this.less(left, smallest)) smallest = left;
      if (right < length && this.less(right, smallest)) smallest = right;
      if (smallest === parent) return;
      this.swap(parent, smallest);
      parent = smallest;
    }
  }

  private swap(a: number, b: number): void {
    swapIn(this.nodes, a, b);
    swapIn(this.primary, a, b);
    swapIn(this.secondary, a, b);
  }
}

function swapIn(values: number[], a: number, b: number): void {
  const value = values[a] ?? 0;
  values[a] = values[b] ?? 0;
  values[b] = value;
}
