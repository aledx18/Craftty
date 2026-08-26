import { useCallback, useState } from 'react'
import type { Settings } from '@/src/storage.js'
import { loadSettings, saveSettings } from '@/src/storage.js'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  return { settings, setSettings: updateSettings }
}
