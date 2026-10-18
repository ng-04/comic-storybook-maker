// Simple mode in demo: one form, writing, then every page drawn without sheets or outline review.
import { beforeAll, describe, expect, it } from 'vitest';
import { mockConfig } from '../api/mock';
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
    startIllustrating(st.id);
    await until(() => storyById(st.id)!.status === 'done');
    expect(storyById(st.id)!.pages.every((p) => p.versions.length === 1 && p.layout === 'caption')).toBe(true);
    await deleteAllReferenceImages();
    expect(storyById(st.id)!.simple!.photo).toBeNull();
    expect(await db.blobIdsOfKind('reference')).toHaveLength(0);
  });
});
