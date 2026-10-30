import { describe, expect, it } from 'vitest';
import { edgeScrollDelta, edgeScrollDirection, stepZoom } from './camera-math';

const viewport = { width: 1280, height: 720 };

describe('edgeScrollDirection', () => {
  it('scrolls toward the edges the pointer touches', () => {
    expect(edgeScrollDirection({ x: 5, y: 360 }, viewport, 24)).toEqual({ x: -1, y: 0 });
    expect(edgeScrollDirection({ x: 1270, y: 715 }, viewport, 24)).toEqual({ x: 1, y: 1 });
    expect(edgeScrollDirection({ x: 640, y: 0 }, viewport, 24)).toEqual({ x: 0, y: -1 });
  });

  it('does not scroll with the pointer away from the edges', () => {
    expect(edgeScrollDirection({ x: 640, y: 360 }, viewport, 24)).toEqual({ x: 0, y: 0 });
  });
});

describe('edgeScrollDelta', () => {
  it('scales with time and keeps the same on-screen speed at any zoom', () => {
    expect(edgeScrollDelta({ x: 1, y: -1 }, 1600, 0.5, 1)).toEqual({ x: 800, y: -800 });
    expect(edgeScrollDelta({ x: 1, y: 0 }, 1600, 0.5, 2)).toEqual({ x: 400, y: 0 });
  });
});

describe('stepZoom', () => {
  const settings = { min: 0.6, max: 1.4, step: 0.1 };

  it('zooms in on wheel up and out on wheel down', () => {
    expect(stepZoom(1, -100, settings)).toBe(1.1);
    expect(stepZoom(1, 100, settings)).toBe(0.9);
    expect(stepZoom(1, 0, settings)).toBe(1);
  });

  it('stays within bounds and does not drift', () => {
    let zoom = 1;
    for (let i = 0; i < 20; i++) zoom = stepZoom(zoom, 100, settings);
    expect(zoom).toBe(0.6);
    for (let i = 0; i < 20; i++) zoom = stepZoom(zoom, -100, settings);
    expect(zoom).toBe(1.4);
  });
});
