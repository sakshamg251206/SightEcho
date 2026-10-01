import { useEffect, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useNarrator } from '../hooks/useNarrator';
import { formatSeconds } from '../lib/format';
import type { Settings } from '../lib/settings';
import type { VisionDescriber } from '../services/describer';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { Spinner } from './Spinner';

const STATUS_TEXT = {
  looking: 'Looking…',
  answering: 'Answering…',
  stopping: 'Stopping…',
} as const;

export function CameraScreen({
  describer,
  settings,
}: {
  describer: VisionDescriber;
  settings: Settings;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camera = useCamera(videoRef, true);
  const { narration, describe, stop, repeat } = useNarrator(describer, videoRef, settings);

  const live = camera.status === 'live';
  const busy = narration.status !== 'idle';
  const canAsk = live && !busy;

  // Keyboard shortcuts for desktop and switch/keyboard users.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, select, textarea, button, a, dialog, summary')) return;
      const key = event.key.toLowerCase();
      if (key === 'escape') stop();
      else if (key === ' ' || key === 'd') {
        event.preventDefault();
        if (canAsk) void describe('scene');
      } else if (key === 't' && canAsk) void describe('text');
      else if (key === 'r') repeat();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAsk, describe, repeat, stop]);

  return (
    <div className="camera">
      <div
        className={`viewfinder${busy ? ' viewfinder--busy' : ''}`}
        onClick={() => canAsk && void describe('scene')}
      >
        <video
          ref={videoRef}
          className="viewfinder__video"
          playsInline
          muted
          autoPlay
          aria-label="Camera preview"
        />
        {camera.status === 'starting' && (
          <div className="viewfinder__overlay">
            <Spinner label="Starting camera" />
            <span>Starting camera…</span>
          </div>
        )}
        {camera.status === 'error' && (
          <div className="viewfinder__overlay viewfinder__overlay--error">
            <Notice
              tone="error"
              title="Camera unavailable"
              action={
                <button type="button" className="button button--secondary" onClick={camera.retry}>
                  Try again
                </button>
              }
            >
              {camera.error}
            </Notice>
          </div>
        )}
        {busy && (
          <div className="viewfinder__chip" aria-hidden="true">
            <Spinner label="" />
            {STATUS_TEXT[narration.status as keyof typeof STATUS_TEXT]}
          </div>
        )}
      </div>

      <section className="answer" aria-label="Answer">
        {/* Announce status changes; the answer itself is spoken unless speech is off. */}
        <p className="visually-hidden" role="status">
          {busy ? STATUS_TEXT[narration.status as keyof typeof STATUS_TEXT] : ''}
        </p>
        {narration.error ? (
          <Notice tone="error">{narration.error}</Notice>
        ) : narration.text ? (
          <>
            <p className="answer__label">
              {narration.mode === 'text' ? 'Text in view' : 'In front of you'}
            </p>
            <p className="answer__text" aria-live={settings.speak ? 'off' : 'polite'}>
              {narration.text}
            </p>
            {narration.durationMs !== null && (
              <p className="answer__meta">
                Answered on this device in {formatSeconds(narration.durationMs)}
              </p>
            )}
          </>
        ) : (
          <p className="answer__hint">
            {busy
              ? 'Thinking about what the camera sees…'
              : 'Tap Describe to hear what’s in front of you, or Read text for signs, labels and pages.'}
          </p>
        )}
        <p className="answer__shortcuts muted">
          Keys: <kbd>Space</kbd> describe · <kbd>T</kbd> read text · <kbd>R</kbd> repeat ·{' '}
          <kbd>Esc</kbd> stop
        </p>
      </section>

      <div className="controls">
        {busy ? (
          <button
            type="button"
            className="button button--danger button--xl"
            onClick={stop}
            disabled={narration.status === 'stopping'}
          >
            <Icon name="stop" />
            {narration.status === 'stopping' ? 'Stopping…' : 'Stop'}
          </button>
        ) : (
          <button
            type="button"
            className="button button--primary button--xl"
            onClick={() => void describe('scene')}
            disabled={!live}
          >
            <Icon name="eye" />
            Describe
          </button>
        )}
        <div className="controls__row">
          <button
            type="button"
            className="button button--secondary button--lg"
            onClick={() => void describe('text')}
            disabled={!canAsk}
          >
            <Icon name="text" />
            Read text
          </button>
          <button
            type="button"
            className="button button--secondary button--lg"
            onClick={repeat}
            disabled={busy || !narration.text || !settings.speak}
          >
            <Icon name="repeat" />
            Repeat
          </button>
        </div>
      </div>
    </div>
  );
}
