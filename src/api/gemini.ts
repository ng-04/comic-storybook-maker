// Gemini ("Nano Banana") image generation over REST, with the user's own key.
// Implements the retry ladder from backend-spec §4.4: transient errors retry in place with
// backoff; refusals (IMAGE_SAFETY, IMAGE_OTHER, …) step down to fewer reference images.

import { getSettings, IMAGE_MODEL } from '../state/settings';
import { ApiError } from './types';

export interface InlineImage {
  mime: string;
  /** base64, no data: prefix */
  data: string;
}

export type Aspect = '1:1' | '3:4' | '4:3' | '4:5' | '5:4';

type Kind = 'transient' | 'refused' | 'fatal';
class ImageError extends ApiError {
  readonly kind: Kind;
  constructor(code: ApiError['code'], message: string, kind: Kind) {
    super(code, message, kind === 'transient');
    this.kind = kind;
  }
}

const REFUSED = /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION|IMAGE_OTHER/;

// At most this many Gemini calls in flight across the whole app (grid pages make six each).
const MAX_CONCURRENT = 3;
let running = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new ApiError('CANCELLED', 'Cancelled.')); }, { once: true });
  });
}

function endpoint(path = ':generateContent') {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(IMAGE_MODEL)}${path}`;
}

function key(): string {
  const k = getSettings().geminiKey.trim();
  if (!k) throw new ApiError('NO_KEY', 'Add your Gemini API key in Settings first.');
  return k;
}

function b64ToBlob(data: string, mime: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function requestOnce(text: string, images: InlineImage[], aspect: Aspect, signal?: AbortSignal): Promise<Blob> {
  const parts = [{ text }, ...images.map((im) => ({ inline_data: { mime_type: im.mime, data: im.data } }))];
  let res: Response;
  try {
    res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } },
      }),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw new ApiError('CANCELLED', 'Cancelled.');
    if (e instanceof ApiError) throw e;
    throw new ImageError('OFFLINE', "Couldn't reach Google's image service. Check your connection.", 'transient');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg: string = data?.error?.message || `Gemini API error ${res.status}`;
    if (res.status === 400 && /API key/i.test(msg)) throw new ImageError('AUTH', 'Google rejected the Gemini API key. Check it in Settings.', 'fatal');
    if (res.status === 401 || res.status === 403) throw new ImageError('AUTH', msg, 'fatal');
    if (res.status === 429) throw new ImageError('RATE_LIMITED', msg, 'transient');
    throw new ImageError('INTERNAL', msg, res.status >= 500 ? 'transient' : 'fatal');
  }
  const cand = data?.candidates?.[0];
  const outParts: { inlineData?: { mimeType?: string; data: string }; inline_data?: { mime_type?: string; data: string } }[] = cand?.content?.parts || [];
  const img = outParts.find((p) => p.inlineData || p.inline_data);
  if (img) {
    const d = (img.inlineData || img.inline_data)!;
    const mime = (img.inlineData?.mimeType || img.inline_data?.mime_type || 'image/png');
    return b64ToBlob(d.data, mime);
  }
  const reason: string = data?.promptFeedback?.blockReason || cand?.finishReason || 'NO_IMAGE';
  if (REFUSED.test(reason)) {
    throw new ImageError(/OTHER/.test(reason) ? 'IMAGE_OTHER' : 'IMAGE_SAFETY', `Gemini declined this picture (${reason}).`, 'refused');
  }
  throw new ImageError('IMAGE_OTHER', `No picture came back (${reason}).`, 'transient');
}

export interface Rung {
  text: string;
  images: InlineImage[];
  note: string;
  step: number;
}

const TRANSIENT_TRIES = 3;

/**
 * Try each rung in order. Transient failures retry the same rung (up to 3 times with backoff);
 * a refusal moves to the next rung. If every rung is refused, throws the last refusal.
 */
export async function drawWithLadder(rungs: Rung[], aspect: Aspect, signal?: AbortSignal): Promise<{ blob: Blob; note: string; step: number }> {
  let last: ApiError = new ApiError('IMAGE_OTHER', 'No picture came back.');
  for (const rung of rungs) {
    for (let t = 1; t <= TRANSIENT_TRIES; t++) {
      if (signal?.aborted) throw new ApiError('CANCELLED', 'Cancelled.');
      try {
        const blob = await slot(() => requestOnce(rung.text, rung.images, aspect, signal));
        return { blob, note: rung.note, step: rung.step };
      } catch (e) {
        if (!(e instanceof ImageError)) throw e;
        last = e;
        if (e.kind === 'fatal') throw e;
        if (e.kind === 'refused') break;
        if (t < TRANSIENT_TRIES) await sleep(1500 * t, signal);
      }
    }
    if (last instanceof ImageError && last.kind === 'transient') throw last;
  }
  throw new ApiError(last.code, 'The image service declined it every way we tried: with the reference images, without them, and from text only.');
}

/** Free check: look up the image model with the key. */
export async function testGeminiKey(): Promise<string> {
  const model = IMAGE_MODEL;
  let res: Response;
  try {
    res = await fetch(endpoint(''), { headers: { 'x-goog-api-key': key() } });
  } catch {
    throw new ApiError('OFFLINE', "Couldn't reach Google. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError('AUTH', data?.error?.message || `Gemini API error ${res.status}`);
  return `Works with ${model}.`;
}

export async function blobToInline(blob: Blob): Promise<InlineImage> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { mime: blob.type || 'image/png', data: btoa(bin) };
}
