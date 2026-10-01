import { describe, expect, it } from 'vitest';
import { selectVoice, type VoiceLike } from '../../src/lib/voices';

const voice = (
  lang: string,
  localService = true,
  isDefault = false,
): VoiceLike & { id: string } => ({
  id: `${lang}-${localService ? 'local' : 'net'}${isDefault ? '-default' : ''}`,
  lang,
  localService,
  default: isDefault,
});

describe('selectVoice', () => {
  it('prefers an exact language match', () => {
    const voices = [voice('en-GB'), voice('en-US')];
    expect(selectVoice(voices, 'en-US')?.id).toBe('en-US-local');
  });

  it('falls back to the same primary language', () => {
    expect(selectVoice([voice('fr-CA'), voice('de-DE')], 'fr-FR')?.id).toBe('fr-CA-local');
  });

  it('prefers on-device voices, which keep working offline', () => {
    const voices = [voice('hi-IN', false, true), voice('hi-IN', true)];
    expect(selectVoice(voices, 'hi-IN')?.id).toBe('hi-IN-local');
  });

  it('accepts underscore-style tags reported by some platforms', () => {
    expect(selectVoice([voice('ja_JP')], 'ja-JP')?.id).toBe('ja_JP-local');
  });

  it('returns undefined when nothing matches', () => {
    expect(selectVoice([voice('en-US')], 'ko-KR')).toBeUndefined();
  });
});
