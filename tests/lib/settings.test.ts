import { describe, expect, it } from 'vitest';
import { defaultSettings, loadSettings, parseSettings, saveSettings } from '../../src/lib/settings';

const defaults = defaultSettings(['en-US']);

describe('parseSettings', () => {
  it('returns defaults for non-objects', () => {
    expect(parseSettings(null, defaults)).toEqual(defaults);
    expect(parseSettings('nope', defaults)).toEqual(defaults);
  });

  it('keeps valid fields and replaces invalid ones', () => {
    expect(
      parseSettings({ language: 'ja-JP', detail: 'verbose', speak: false, rate: 'fast' }, defaults),
    ).toEqual({ ...defaults, language: 'ja-JP', speak: false });
  });

  it('clamps the speech rate', () => {
    expect(parseSettings({ rate: 9 }, defaults).rate).toBe(2);
    expect(parseSettings({ rate: 0 }, defaults).rate).toBe(0.5);
  });

  it('rejects unsupported languages', () => {
    expect(parseSettings({ language: 'klingon' }, defaults).language).toBe(defaults.language);
  });
});

describe('loadSettings / saveSettings', () => {
  it('round-trips through storage', () => {
    const settings = { ...defaults, detail: 'detailed' as const, rate: 1.4 };
    saveSettings(localStorage, settings);
    expect(loadSettings(localStorage, defaults)).toEqual(settings);
  });

  it('survives corrupt JSON', () => {
    localStorage.setItem('sightecho:settings', '{oops');
    expect(loadSettings(localStorage, defaults)).toEqual(defaults);
  });

  it('works without storage', () => {
    expect(loadSettings(undefined, defaults)).toEqual(defaults);
    expect(() => saveSettings(undefined, defaults)).not.toThrow();
  });
});

describe('defaultSettings', () => {
  it('follows the browser language', () => {
    expect(defaultSettings(['es-MX']).language).toBe('es-ES');
  });
});
