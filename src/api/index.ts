import { getSettings } from '../state/settings';
import { directApi } from './direct';
import { mockApi } from './mock';
import type { StoryApi } from './types';

/** The client for the current mode. Phase 2 adds the HTTP client for the AWS backend here. */
export function api(): StoryApi {
  return getSettings().demo ? mockApi : directApi;
}

export * from './types';
