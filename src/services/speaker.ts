import { selectVoice } from '../lib/voices';

export interface SpeakOptions {
  lang: string;
  rate: number;
}

/** Text-to-speech output. Abstracted so the UI can be tested without audio. */
export interface Speaker {
  readonly available: boolean;
  /** Queues text after anything already being spoken. */
  speak(text: string, options: SpeakOptions): void;
  /** Stops speaking and clears the queue. */
  cancel(): void;
  /** Whether an installed voice can speak this language. */
  hasVoiceFor(lang: string): boolean;
}

export function createBrowserSpeaker(scope: typeof globalThis = globalThis): Speaker {
  const synth = 'speechSynthesis' in scope ? scope.speechSynthesis : undefined;
  let voices: SpeechSynthesisVoice[] = synth?.getVoices() ?? [];
  // Voices load asynchronously on most browsers.
  synth?.addEventListener?.('voiceschanged', () => {
    voices = synth.getVoices();
  });
  const currentVoices = () => (voices.length > 0 ? voices : (synth?.getVoices() ?? []));

  return {
    available: synth !== undefined,

    speak(text, { lang, rate }) {
      if (!synth || !text.trim()) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      const voice = selectVoice(currentVoices(), lang);
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    },

    cancel() {
      synth?.cancel();
    },

    hasVoiceFor(lang) {
      return selectVoice(currentVoices(), lang) !== undefined;
    },
  };
}
