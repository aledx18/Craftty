import { useState, useCallback } from 'react';
import { loadSettings, saveSettings } from '../storage.js';
import type { Settings } from '../storage.js';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, setSettings: updateSettings };
}
