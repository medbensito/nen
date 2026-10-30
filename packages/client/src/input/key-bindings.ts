import type { DeepReadonly, InputBindings, KeyAction } from '@nen/sim';

/** Physical key code (`KeyboardEvent.code`) → action. */
export type KeyMap = ReadonlyMap<string, KeyAction>;

export function createKeyMap(bindings: DeepReadonly<InputBindings>): KeyMap {
  const map = new Map<string, KeyAction>();
  for (const [action, code] of Object.entries(bindings.keys) as [KeyAction, string][]) {
    map.set(code, action);
  }
  return map;
}
