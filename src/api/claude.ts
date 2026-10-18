// Claude (story text) via the official SDK, running in the browser with the user's own key.
// Structured outputs (output_config.format) guarantee JSON matching our schema; we still
// validate page and panel counts and retry once (backend-spec §4.3).

import Anthropic from '@anthropic-ai/sdk';
import { getSettings } from '../state/settings';
import { ApiError } from './types';

function client(): Anthropic {
  const s = getSettings();
  if (!s.anthropicKey.trim()) throw new ApiError('NO_KEY', 'Add your Anthropic API key in Settings first.');
  return new Anthropic({
    apiKey: s.anthropicKey.trim(),
    // The key belongs to the person using the page and never leaves their browser except to Anthropic.
    dangerouslyAllowBrowser: true,
    // Keys that aren't scoped to a workspace must say which workspace to bill.
    defaultHeaders: s.workspaceId.trim() ? { 'anthropic-workspace-id': s.workspaceId.trim() } : undefined,
    maxRetries: 2,
  });
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof Anthropic.APIUserAbortError) return new ApiError('CANCELLED', 'Cancelled.');
  if (e instanceof Anthropic.AuthenticationError) return new ApiError('AUTH', 'Anthropic rejected the API key. Check it in Settings.');
  if (e instanceof Anthropic.PermissionDeniedError) return new ApiError('AUTH', `Anthropic refused access: ${e.message}`);
  if (e instanceof Anthropic.RateLimitError) return new ApiError('RATE_LIMITED', 'Anthropic is rate-limiting this key. Wait a minute and try again.', true);
  if (e instanceof Anthropic.APIConnectionError) return new ApiError('OFFLINE', "Couldn't reach Anthropic. Check your connection.", true);
  if (e instanceof Anthropic.BadRequestError) {
    const msg = e.message || '';
    if (/workspace/i.test(msg)) return new ApiError('AUTH', 'This key needs a workspace ID. Add it in Settings (it starts with wrkspc_).');
    if (/credit|billing|balance/i.test(msg)) return new ApiError('AUTH', 'Your Anthropic account is out of credit. Add credit in the Anthropic Console.');
    return new ApiError('INTERNAL', msg);
  }
  if (e instanceof Anthropic.APIError) return new ApiError('INTERNAL', e.message, (e.status ?? 0) >= 500);
  return new ApiError('INTERNAL', e instanceof Error ? e.message : String(e));
}

/** One structured-output request. Returns the parsed JSON object. */
export async function claudeJson<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  signal?: AbortSignal;
}): Promise<T> {
  const s = getSettings();
  try {
    const stream = client().beta.messages.stream({
      model: s.storyModel,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: opts.schema } },
      // If a safety classifier declines, the API retries on a suitable model within the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    }, { signal: opts.signal });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') {
      throw new ApiError('CONTENT_BLOCKED', "Claude declined to write this story. Try softening the plot or the paristhiti.");
    }
    if (msg.stop_reason === 'max_tokens') {
      throw new ApiError('GENERATION_INVALID', 'The story came back too long. Try fewer pages or single-scene pages.', true);
    }
    const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError('GENERATION_INVALID', 'The story came back in an unexpected shape.', true);
    }
  } catch (e) {
    throw toApiError(e);
  }
}

/** A tiny request that proves the key, workspace, model access and billing all work. */
export async function testAnthropicKey(): Promise<string> {
  const s = getSettings();
  try {
    await client().messages.create({
      model: s.storyModel,
      max_tokens: 64,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: 'Reply with the word ok.' }],
    });
    return `Works with ${s.storyModel}.`;
  } catch (e) {
    throw toApiError(e);
  }
}
