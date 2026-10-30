/** What `navigator.keyboard.getLayoutMap()` resolves to, where the browser has it. */
export type KeyboardLayout = ReadonlyMap<string, string>;

/**
 * The character printed on the key at a physical position. With the
 * browser's layout map, `KeyQ` shows "A" on an AZERTY keyboard; without it
 * (Firefox, Safari), the QWERTY letter is shown.
 */
export function keyLabel(code: string, layout?: KeyboardLayout): string {
  const printed = layout?.get(code);
  if (printed) return printed.toUpperCase();
  const letter = /^Key([A-Z])$/.exec(code)?.[1];
  if (letter) return letter;
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)?.[1];
  if (digit) return digit;
  return code;
}

interface NavigatorWithKeyboard {
  keyboard?: { getLayoutMap?: () => Promise<KeyboardLayout> };
}

/** The keyboard layout, or undefined where the browser does not expose it. */
export async function loadKeyboardLayout(): Promise<KeyboardLayout | undefined> {
  const keyboard = (navigator as unknown as NavigatorWithKeyboard).keyboard;
  try {
    return await keyboard?.getLayoutMap?.();
  } catch {
    return undefined;
  }
}
