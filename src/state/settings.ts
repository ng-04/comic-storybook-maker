// Phase 1 settings. Each user brings their own API keys; they are kept in this browser's
// localStorage and sent only to Anthropic and Google. Nothing here is ever built into the bundle.

import { useSyncExternalStore } from 'react';

export const STORY_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (best stories)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (faster, cheaper)' },
];
export const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

export interface Settings {
  anthropicKey: string;
  workspaceId: string;
  geminiKey: string;
  storyModel: string;
  imageModel: string;
  /** Demo mode swaps in the mock API: no keys, simulated stories and pictures. */
  demo: boolean;
}

const KEY = 'csm2-settings';
const DEFAULTS: Settings = {
  anthropicKey: '', workspaceId: '', geminiKey: '',
  storyModel: STORY_MODELS[0].id, imageModel: DEFAULT_IMAGE_MODEL, demo: false,
};

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

let current = read();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* private mode: keep in memory */ }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getSettings);
}

/** Ready to make real books, or running the demo. */
export function isConfigured(s: Settings = current): boolean {
  return s.demo || (!!s.anthropicKey.trim() && !!s.geminiKey.trim());
}
