// Simple mode in demo: one form, writing, then every page drawn without sheets or outline review.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mockApi, mockConfig } from '../api/mock';
import { simpleCharacters, blankSimple } from '../domain/model';
import { db } from '../state/db';
import { updateSettings } from '../state/settings';
import { createStory, deleteAllReferenceImages, pendingSheets, setSimplePhoto, startIllustrating, storyById, writeOutline } from '../state/store';

const until = async (fn: () => boolean, ms = 5000) => {
  const t0 = Date.now();
  while (!fn()) { if (Date.now() - t0 > ms) throw new Error('timed out'); await new Promise((r) => setTimeout(r, 10)); }
};

describe('simple mode', () => {
  beforeAll(() => { updateSettings({ demo: true }); mockConfig.speed = 0.001; mockConfig.images = 'works'; });

  it('parses the other characters', () => {
    const cs = simpleCharacters(blankSimple());
    expect(cs.map((c) => c.name)).toEqual(['Avyay', 'baby brother Rudrav', 'Mama', 'Papa']);
    expect(cs[0].role).toBe('nayak');
  });

  it('writes and draws a whole book with no sheets to approve', async () => {
    const st = createStory('simple');
    expect(st.mode).toBe('simple');
    await setSimplePhoto(st.id, new File(['x'], 'family.jpg', { type: 'image/jpeg' }));
    expect(storyById(st.id)!.simple!.photo).not.toBeNull();
    expect(await writeOutline(st.id)).toBe(true);
    const w = storyById(st.id)!;
    expect(w.pages).toHaveLength(12);
    expect(w.characters[0].name).toBe('Avyay');
    expect(w.simple!.characters).toContain('Avyay');
    expect(pendingSheets(w)).toHaveLength(0);

    // Review before spend: writing the story draws nothing; only the user's approval does.
    const drawSpy = vi.spyOn(mockApi, 'drawPage');
    await new Promise((r) => setTimeout(r, 50));
    expect(drawSpy).not.toHaveBeenCalled();
    expect(w.status).toBe('outline');
    expect(w.pages.every((p) => p.status === 'none' && p.versions.length === 0)).toBe(true);
    startIllustrating(st.id);
    await until(() => storyById(st.id)!.status === 'done');
    expect(storyById(st.id)!.pages.every((p) => p.versions.length === 1 && p.layout === 'caption')).toBe(true);
    expect(drawSpy).toHaveBeenCalledTimes(12);
    await deleteAllReferenceImages();
    expect(storyById(st.id)!.simple!.photo).toBeNull();
    expect(await db.blobIdsOfKind('reference')).toHaveLength(0);
  });
});
