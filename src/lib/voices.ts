/** The subset of SpeechSynthesisVoice that voice selection depends on. */
export interface VoiceLike {
  lang: string;
  localService: boolean;
  default: boolean;
}

/**
 * Picks the best installed voice for a language. On-device voices are
 * preferred because network voices stop working offline.
 */
export function selectVoice<T extends VoiceLike>(voices: readonly T[], tag: string): T | undefined {
  const normalize = (lang: string) => lang.replace('_', '-').toLowerCase();
  const wanted = normalize(tag);
  const primary = wanted.split('-')[0];

  const score = (voice: T): number => {
    const lang = normalize(voice.lang);
    let value = 0;
    if (lang === wanted) value += 4;
    else if (lang.split('-')[0] === primary) value += 2;
    else return -1;
    if (voice.localService) value += 1.5;
    if (voice.default) value += 0.5;
    return value;
  };

  let best: T | undefined;
  let bestScore = -1;
  for (const voice of voices) {
    const value = score(voice);
    if (value > bestScore) {
      best = voice;
      bestScore = value;
    }
  }
  return best;
}
