import { describe, expect, it, vi } from 'vitest';
import { createBrowserSpeaker } from '../../src/services/speaker';

class FakeUtterance {
  lang = '';
  rate = 1;
  voice: unknown = null;
  constructor(public text: string) {}
}

function fakeScope(voices: { lang: string; localService: boolean; default: boolean }[]) {
  const speechSynthesis = {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
  };
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { scope: { speechSynthesis } as unknown as typeof globalThis, speechSynthesis };
}

describe('createBrowserSpeaker', () => {
  it('speaks with the best matching voice, language and rate', () => {
    const hindi = { lang: 'hi-IN', localService: true, default: false };
    const { scope, speechSynthesis } = fakeScope([
      { lang: 'en-US', localService: true, default: true },
      hindi,
    ]);
    const speaker = createBrowserSpeaker(scope);

    speaker.speak('नमस्ते', { lang: 'hi-IN', rate: 1.3 });

    const utterance = speechSynthesis.speak.mock.calls[0]?.[0] as FakeUtterance;
    expect(utterance).toMatchObject({ text: 'नमस्ते', lang: 'hi-IN', rate: 1.3, voice: hindi });
  });

  it('ignores empty text and reports missing voices', () => {
    const { scope, speechSynthesis } = fakeScope([
      { lang: 'en-US', localService: true, default: true },
    ]);
    const speaker = createBrowserSpeaker(scope);
    speaker.speak('   ', { lang: 'en-US', rate: 1 });
    expect(speechSynthesis.speak).not.toHaveBeenCalled();
    expect(speaker.hasVoiceFor('en-GB')).toBe(true);
    expect(speaker.hasVoiceFor('ko-KR')).toBe(false);
  });

  it('is a safe no-op when speech is unavailable', () => {
    const speaker = createBrowserSpeaker({} as typeof globalThis);
    expect(speaker.available).toBe(false);
    expect(() => {
      speaker.speak('Hello', { lang: 'en-US', rate: 1 });
      speaker.cancel();
    }).not.toThrow();
  });
});
