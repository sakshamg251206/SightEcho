import { findLanguage, preferredLanguage } from './languages';
import type { DetailLevel } from './prompt';

export interface Settings {
  /** BCP 47 code of the answer language. */
  language: string;
  detail: DetailLevel;
  /** Read answers aloud. Turn off when a screen reader already reads them. */
  speak: boolean;
  /** Speech rate, 0.5 (slow) to 2 (fast). */
  rate: number;
}

export const RATE_MIN = 0.5;
export const RATE_MAX = 2;

const STORAGE_KEY = 'sightecho:settings';

export function defaultSettings(browserLanguages: readonly string[] = []): Settings {
  return {
    language: preferredLanguage(browserLanguages),
    detail: 'brief',
    speak: true,
    rate: 1,
  };
}

/** Validates untrusted stored data field by field, falling back to defaults. */
export function parseSettings(raw: unknown, defaults: Settings): Settings {
  if (typeof raw !== 'object' || raw === null) return defaults;
  const value = raw as Record<string, unknown>;

  const language =
    typeof value.language === 'string' ? findLanguage(value.language)?.code : undefined;
  const detail = value.detail === 'brief' || value.detail === 'detailed' ? value.detail : undefined;
  const rate =
    typeof value.rate === 'number' && Number.isFinite(value.rate)
      ? Math.min(RATE_MAX, Math.max(RATE_MIN, value.rate))
      : undefined;

  return {
    language: language ?? defaults.language,
    detail: detail ?? defaults.detail,
    speak: typeof value.speak === 'boolean' ? value.speak : defaults.speak,
    rate: rate ?? defaults.rate,
  };
}

export function loadSettings(storage: Storage | undefined, defaults: Settings): Settings {
  try {
    const stored = storage?.getItem(STORAGE_KEY);
    return stored ? parseSettings(JSON.parse(stored), defaults) : defaults;
  } catch {
    return defaults;
  }
}

export function saveSettings(storage: Storage | undefined, settings: Settings): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or full storage: settings simply won't persist.
  }
}
