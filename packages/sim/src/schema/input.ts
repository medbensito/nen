import { z } from 'zod';

/**
 * `KeyboardEvent.code` values: physical key positions, so a binding stays at
 * the same place on AZERTY and QWERTY keyboards.
 */
const KEY_CODE =
  /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|F(?:[1-9]|1[0-2])|Space|Escape|Tab|Enter|Backspace|Backquote|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash|Arrow(?:Up|Down|Left|Right)|(?:Shift|Control|Alt)(?:Left|Right))$/;

export const keyCodeSchema = z
  .string()
  .regex(KEY_CODE, 'must be a physical key code, e.g. "KeyS" or "Space"');

/** data/input/bindings.json */
export const inputBindingsSchema = z.strictObject({
  keys: z.strictObject({
    stop: keyCodeSchema,
    toggleCameraLock: keyCodeSchema,
    centerCamera: keyCodeSchema,
  }),
  /** Seconds between two move orders while the move button is held down. */
  moveRepeatInterval: z.number().positive(),
});

export type InputBindings = z.infer<typeof inputBindingsSchema>;
export type KeyAction = keyof InputBindings['keys'];

/** data/input/camera.json */
export const cameraSettingsSchema = z.strictObject({
  /** Whether the camera follows the champion when the match starts. */
  startLocked: z.boolean(),
  /** Screen pixels from the window edge where the free camera starts scrolling. */
  edgeScrollMargin: z.number().nonnegative(),
  /** World units per second at zoom 1. */
  edgeScrollSpeed: z.number().positive(),
  zoom: z
    .strictObject({
      initial: z.number().positive(),
      min: z.number().positive(),
      max: z.number().positive(),
      /** Zoom change per mouse wheel notch. */
      step: z.number().positive(),
    })
    .refine((zoom) => zoom.min <= zoom.initial && zoom.initial <= zoom.max, {
      message: 'must satisfy min <= initial <= max',
      path: ['initial'],
    }),
});

export type CameraSettings = z.infer<typeof cameraSettingsSchema>;

/** Two actions bound to the same key would make one of them unreachable. */
export function checkBindings(
  bindings: InputBindings,
  report: (path: string, message: string) => void,
): void {
  const actionByKey = new Map<string, string>();
  for (const [action, key] of Object.entries(bindings.keys)) {
    const other = actionByKey.get(key);
    if (other === undefined) actionByKey.set(key, action);
    else report(`keys.${action}`, `uses the same key as "${other}" (${key})`);
  }
}
