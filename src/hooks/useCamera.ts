import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { toUserMessage } from '../lib/errors';

export type CameraStatus = 'off' | 'starting' | 'live' | 'error';

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    // Rear camera on phones; any camera elsewhere.
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

/**
 * Streams the camera into a <video> element while `enabled`. The camera is
 * released whenever the page is hidden, for privacy and battery life.
 */
export function useCamera(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const [status, setStatus] = useState<CameraStatus>('off');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const stop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const start = async () => {
      if (streamRef.current) return;
      setStatus('starting');
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
        if (cancelled || document.hidden) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        if (!cancelled) setStatus('live');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(toUserMessage(err));
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
        setStatus('off');
      } else {
        void start();
      }
    };

    void start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
      setStatus('off');
    };
  }, [enabled, videoRef, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, error, retry };
}
