import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawWithLadder, type Rung } from '../api/gemini';
import { updateSettings } from '../state/settings';

const img = { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: btoa('png') } }] } }] }) };
const refused = (reason: string) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: reason }] }) });
const err = (status: number, message: string) => ({ ok: false, status, json: async () => ({ error: { message } }) });

const rungs: Rung[] = [
  { text: 'with refs', images: [{ mime: 'image/png', data: 'AA' }], note: '', step: 1 },
  { text: 'sheets only', images: [], note: 'no photos', step: 2 },
  { text: 'text only', images: [], note: 'text', step: 3 },
];

describe('drawWithLadder (backend-spec §4.4)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    updateSettings({ geminiKey: 'test-key' });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  const sentTexts = () => fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).contents[0].parts[0].text);

  it('steps down on a refusal and reports the step that worked', async () => {
    fetchMock.mockResolvedValueOnce(refused('IMAGE_OTHER')).mockResolvedValueOnce(img);
    const r = await drawWithLadder(rungs, '4:5');
    expect(r.step).toBe(2);
    expect(r.note).toBe('no photos');
    expect(sentTexts()).toEqual(['with refs', 'sheets only']);
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('test-key');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).generationConfig).toEqual({ responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:5' } });
  });

  it('retries transient errors on the same rung before stepping down', async () => {
    fetchMock.mockResolvedValueOnce(err(503, 'busy')).mockResolvedValueOnce(img);
    const r = await drawWithLadder(rungs, '4:5');
    expect(r.step).toBe(1);
    expect(sentTexts()).toEqual(['with refs', 'with refs']);
  });

  it('fails with the refusal code when every rung is refused', async () => {
    fetchMock.mockResolvedValue(refused('IMAGE_SAFETY'));
    await expect(drawWithLadder(rungs, '4:5')).rejects.toMatchObject({ code: 'IMAGE_SAFETY' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('stops immediately on a rejected key', async () => {
    fetchMock.mockResolvedValue(err(400, 'API key not valid. Please pass a valid API key.'));
    await expect(drawWithLadder(rungs, '4:5')).rejects.toMatchObject({ code: 'AUTH' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
