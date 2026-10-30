import { describe, expect, it } from 'vitest';
import { advanceClock, createFixedStepClock } from './clock';

describe('fixed-step clock', () => {
  it('runs one tick per elapsed step and keeps the remainder', () => {
    const clock = createFixedStepClock(30, 5);

    expect(advanceClock(clock, 50)).toEqual({ steps: 1, alpha: expect.closeTo(0.5, 6) });
    expect(advanceClock(clock, 20).steps).toBe(1);
    expect(advanceClock(clock, 0).steps).toBe(0);
  });

  it('accumulates frames shorter than a tick', () => {
    const clock = createFixedStepClock(30, 5);
    const frame = 1000 / 60;

    expect(advanceClock(clock, frame).steps).toBe(0);
    expect(advanceClock(clock, frame).steps).toBe(1);
  });

  it('runs exactly tickRate ticks per simulated second at 60 fps', () => {
    const clock = createFixedStepClock(30, 5);
    let ticks = 0;
    for (let frame = 0; frame < 600; frame++) ticks += advanceClock(clock, 1000 / 60).steps;
    expect(ticks).toBeGreaterThanOrEqual(299);
    expect(ticks).toBeLessThanOrEqual(300);
  });

  it('caps the ticks of one frame and drops the backlog after a stall', () => {
    const clock = createFixedStepClock(30, 5);

    const afterStall = advanceClock(clock, 2000);
    expect(afterStall.steps).toBe(5);
    expect(afterStall.alpha).toBeLessThan(1);
    expect(advanceClock(clock, 1000 / 60).steps).toBeLessThanOrEqual(1);
  });

  it('ignores negative elapsed time', () => {
    const clock = createFixedStepClock(30, 5);
    expect(advanceClock(clock, -100)).toEqual({ steps: 0, alpha: 0 });
  });
});
