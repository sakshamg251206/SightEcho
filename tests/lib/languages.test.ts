import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  findLanguage,
  LANGUAGES,
  preferredLanguage,
} from '../../src/lib/languages';

describe('findLanguage', () => {
  it('matches exact tags case-insensitively', () => {
    expect(findLanguage('hi-in')?.name).toBe('Hindi');
  });

  it('falls back to the primary subtag', () => {
    expect(findLanguage('pt-PT')?.code).toBe('pt-BR');
    expect(findLanguage('en-GB')?.code).toBe('en-US');
  });

  it('returns undefined for unsupported or missing tags', () => {
    expect(findLanguage('xx-YY')).toBeUndefined();
    expect(findLanguage(undefined)).toBeUndefined();
  });

  it('has unique codes', () => {
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(LANGUAGES.length);
  });
});

describe('preferredLanguage', () => {
  it('picks the first supported browser language', () => {
    expect(preferredLanguage(['xx', 'fr-CA', 'de'])).toBe('fr-FR');
  });

  it('defaults to English', () => {
    expect(preferredLanguage([])).toBe(DEFAULT_LANGUAGE);
  });
});
