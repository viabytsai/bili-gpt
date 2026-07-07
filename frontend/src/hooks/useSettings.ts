import { useState, useCallback } from 'react'
import type { Settings } from '../types'

const STORAGE_KEY = 'bili-gpt-settings'

const defaultSettings: Settings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  summaryPrompt: '',
  segmentPrompt: '',
  mindmapPrompt: '',
  sessdata: '',
  biliJct: '',
  buvid3: '',
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...defaultSettings }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings)

  const saveSettings = useCallback((s: Settings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSettingsState(s)
  }, [])

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSettingsState({ ...defaultSettings })
  }, [])

  return { settings, saveSettings, resetSettings, defaultSettings }
}
