/**
 * Data is written in human units (seconds, degrees); the simulation counts in
 * ticks and radians. These conversions run once, at load time.
 */
export function secondsToTicks(seconds: number, tickRate: number): number {
  return Math.round(seconds * tickRate);
}

export function perSecondToPerTick(perSecond: number, tickRate: number): number {
  return perSecond / tickRate;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
