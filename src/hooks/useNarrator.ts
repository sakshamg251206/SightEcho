import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { toUserMessage } from '../lib/errors';
import { captureFrame } from '../lib/frame';
import { findLanguage } from '../lib/languages';
import { buildInstruction, type DescribeMode } from '../lib/prompt';
import { cleanResponse } from '../lib/response';
import { SentenceStream } from '../lib/sentences';
import type { Settings } from '../lib/settings';
import type { VisionDescriber } from '../services/describer';
import { pulse } from '../services/haptics';
import { useServices } from '../services/services';

export type NarrationStatus = 'idle' | 'looking' | 'answering' | 'stopping';

export interface Narration {
  status: NarrationStatus;
  mode: DescribeMode | null;
  text: string;
  error: string | null;
  /** Time from tap to complete answer, measured on this device. */
  durationMs: number | null;
}

const IDLE: Narration = { status: 'idle', mode: null, text: '', error: null, durationMs: null };

export const EMPTY_ANSWER =
  'I could not make anything out. Hold the phone steady, add some light, and try again.';

/** Captures a frame, asks the model about it, and speaks the answer as it streams. */
export function useNarrator(
  describer: VisionDescriber | null,
  videoRef: RefObject<HTMLVideoElement | null>,
  settings: Settings,
) {
  const { speaker } = useServices();
  const [narration, setNarration] = useState<Narration>(IDLE);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runRef = useRef(0);
  const busyRef = useRef(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => () => speaker.cancel(), [speaker]);

  const describe = useCallback(
    async (mode: DescribeMode) => {
      const video = videoRef.current;
      if (!describer || !video || busyRef.current) return;

      const { language, detail, speak, rate } = settingsRef.current;
      const lang = findLanguage(language) ?? { code: 'en-US', name: 'English' };
      const say = (text: string) => speak && speaker.speak(text, { lang: lang.code, rate });

      let image: HTMLCanvasElement;
      try {
        canvasRef.current ??= document.createElement('canvas');
        image = captureFrame(video, canvasRef.current);
      } catch (error) {
        setNarration({ ...IDLE, error: toUserMessage(error) });
        return;
      }

      const run = ++runRef.current;
      busyRef.current = true;
      pulse();
      speaker.cancel();
      setNarration({ ...IDLE, status: 'looking', mode });

      const sentences = new SentenceStream(lang.code);
      const startedAt = performance.now();
      const instruction = buildInstruction({ mode, detail, languageName: lang.name });

      try {
        const raw = await describer.describe(image, instruction, (partial) => {
          if (run !== runRef.current) return;
          const text = cleanResponse(partial);
          if (!text) return;
          sentences.push(text).forEach(say);
          setNarration((n) => ({ ...n, status: 'answering', text }));
        });
        if (run !== runRef.current) return;

        const text = cleanResponse(raw) || EMPTY_ANSWER;
        if (text === EMPTY_ANSWER) say(text);
        else sentences.push(text, true).forEach(say);
        setNarration({
          status: 'idle',
          mode,
          text,
          error: null,
          durationMs: performance.now() - startedAt,
        });
      } catch (error) {
        if (run !== runRef.current) return;
        speaker.cancel();
        setNarration({ ...IDLE, mode, error: toUserMessage(error) });
      } finally {
        busyRef.current = false;
        // A stopped run finishes in the background; release the UI once it has.
        if (run !== runRef.current)
          setNarration((n) => (n.status === 'stopping' ? { ...n, status: 'idle' } : n));
      }
    },
    [describer, speaker, videoRef],
  );

  const stop = useCallback(() => {
    if (!busyRef.current) {
      speaker.cancel();
      return;
    }
    runRef.current += 1;
    describer?.cancel();
    speaker.cancel();
    setNarration((n) => ({ ...n, status: 'stopping' }));
  }, [describer, speaker]);

  const repeat = useCallback(() => {
    const { language, rate } = settingsRef.current;
    if (!narration.text || busyRef.current) return;
    speaker.cancel();
    speaker.speak(narration.text, { lang: findLanguage(language)?.code ?? language, rate });
  }, [narration.text, speaker]);

  return { narration, describe, stop, repeat };
}
