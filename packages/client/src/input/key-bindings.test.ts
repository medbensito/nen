import { describe, expect, it } from 'vitest';
import { createKeyMap } from './key-bindings';

const defaults = {
  keys: {
    ability1: 'KeyQ',
    ability2: 'KeyW',
    ability3: 'KeyE',
    ability4: 'KeyR',
    stop: 'KeyS',
    toggleCameraLock: 'KeyY',
    centerCamera: 'Space',
  },
  moveRepeatInterval: 0.15,
};

describe('createKeyMap', () => {
  it('maps physical key codes to actions', () => {
    const keys = createKeyMap(defaults);
    expect(keys.get('KeyS')).toBe('stop');
    expect(keys.get('KeyY')).toBe('toggleCameraLock');
    expect(keys.get('Space')).toBe('centerCamera');
    expect(keys.get('KeyQ')).toBe('ability1');
    expect(keys.get('KeyR')).toBe('ability4');
    expect(keys.get('KeyZ')).toBeUndefined();
  });

  it('follows a binding changed in the data', () => {
    const keys = createKeyMap({ ...defaults, keys: { ...defaults.keys, stop: 'KeyX' } });
    expect(keys.get('KeyX')).toBe('stop');
    expect(keys.get('KeyS')).toBeUndefined();
  });
});
