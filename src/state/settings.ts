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

// v1 (ng-04.github.io/comic/) runs on the same origin and saved its keys under these names.
// On first visit, carry them over so people don't have to paste them again.
const V1_KEYS = { anthropicKey: 'comicAnthropicKey', workspaceId: 'comicWorkspaceId', geminiKey: 'comicGeminiKey' } as const;

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    const fromV1 = { ...DEFAULTS };
    for (const [field, v1] of Object.entries(V1_KEYS)) fromV1[field as keyof typeof V1_KEYS] = (localStorage.getItem(v1) || '').trim();
    return fromV1;
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
