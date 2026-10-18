// The one interface every screen uses for AI work. Phase 1 has two implementations:
//   direct.ts - calls Claude and Gemini from the browser with the user's own keys
//   mock.ts   - simulated stories, pictures, delays and refusals (demo mode, tests)
// Phase 2 adds http.ts against the AWS API in docs/api-contract-spec.md: each method there
// starts a job (202 { jobId }) and polls GET /jobs/{id}, so the signatures below stay the same.

import type { Character, Layout, Page, Panel, Story } from '../domain/types';

export interface OutlinePage {
  kind: Page['kind'];
  caption: string;
  imagePrompt: string;
  layout: Layout;
  location: string;
  bubble: string;
  panels: Panel[];
}

export interface OutlineResult {
  title: string;
  formatReason: string;
  pages: OutlinePage[];
}

export interface RewriteResult {
  caption: string;
  imagePrompt: string;
  bubble: string;
  panels: Panel[];
}

export interface ImageResult {
  blob: Blob;
  note: string;
  step: number;
}

export interface PageImageResult {
  /** Present for single and full-picture pages. */
  image: ImageResult | null;
  /** Six images for grid pages. */
  panels: ImageResult[];
  note: string;
  step: number;
}

export interface KeyTestResult {
  ok: boolean;
  message: string;
}

export interface StoryApi {
  readonly mode: 'direct' | 'mock';
  writeOutline(story: Story, signal?: AbortSignal): Promise<OutlineResult>;
  rewritePage(story: Story, pageId: string, signal?: AbortSignal): Promise<RewriteResult>;
  drawSheet(story: Story, character: Character, signal?: AbortSignal): Promise<ImageResult>;
  drawPage(story: Story, pageId: string, signal?: AbortSignal): Promise<PageImageResult>;
}

export type ErrorCode =
  | 'NO_KEY' | 'AUTH' | 'RATE_LIMITED' | 'OFFLINE' | 'CANCELLED'
  | 'IMAGE_SAFETY' | 'IMAGE_OTHER' | 'GENERATION_INVALID' | 'CONTENT_BLOCKED' | 'INTERNAL';

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  constructor(code: ErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function asApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof DOMException && e.name === 'AbortError') return new ApiError('CANCELLED', 'Cancelled.');
  const msg = e instanceof Error ? e.message : String(e);
  return new ApiError('INTERNAL', msg || 'Something went wrong.');
}
