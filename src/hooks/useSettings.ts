import { useCallback, useState } from 'react';
import { defaultSettings, loadSettings, saveSettings, type Settings } from '../lib/settings';

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings(storage(), defaultSettings(navigator.languages ?? [navigator.language])),
  );

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveSettings(storage(), next);
      return next;
    });
  }, []);

  return [settings, update] as const;
}
