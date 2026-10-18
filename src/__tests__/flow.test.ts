// J1–J4 in demo mode, end to end through the store: set up, approve sheets, write, draw, finish.
import { beforeAll, describe, expect, it } from 'vitest';
import { mockConfig } from '../api/mock';
import { db } from '../state/db';
import { updateSettings } from '../state/settings';
import { approveSheet, createSequel, createStory, deleteAllReferenceImages, deleteStory, drawSheet, getState, loadLibrary, pendingSheets, startIllustrating, storyById, updateStory, writeOutline, addRefFiles } from '../state/store';

const until = async (fn: () => boolean, ms = 5000) => {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
};

describe('demo-mode journey', () => {
  beforeAll(async () => {
    updateSettings({ demo: true });
    mockConfig.speed = 0.001;
    mockConfig.images = 'works';
    await loadLibrary();
  });

  it('goes from a blank katha to a finished book', async () => {
    const st = createStory();
    updateStory(st.id, (x) => ({
      ...x,
      setup: { ...x.setup, desh: { main: 'A forest by the Narmada', subs: ['Jamun tree'] }, katha: 'Chiku keeps a promise.', pageCount: 6, format: 'grid' },
      characters: x.characters.map((c) => ({ ...c, name: 'Chiku', form: 'Animal' as const })),
    }));
    await addRefFiles(st.id, { type: 'char', id: storyById(st.id)!.characters[0].id }, [new File(['x'], 'chiku.jpg', { type: 'image/jpeg' })]);
    expect(storyById(st.id)!.characters[0].refs).toHaveLength(1);

    const c = storyById(st.id)!.characters[0];
    await drawSheet(st.id, c.id);
    expect(storyById(st.id)!.characters[0].sheet.status).toBe('review');
    expect(pendingSheets(storyById(st.id)!)).toHaveLength(1);
    approveSheet(st.id, storyById(st.id)!.characters[0]);
    expect(pendingSheets(storyById(st.id)!)).toHaveLength(0);

    expect(await writeOutline(st.id)).toBe(true);
    const outlined = storyById(st.id)!;
    expect(outlined.status).toBe('outline');
    expect(outlined.pages).toHaveLength(6);
    expect(outlined.pages[1].panels).toHaveLength(6);

    startIllustrating(st.id);
    await until(() => storyById(st.id)!.status === 'done');
    const done = storyById(st.id)!;
    expect(done.pages.every((p) => p.versions.length === 1)).toBe(true);
    expect(done.pages[1].versions[0].panelBlobIds).toHaveLength(6);
    expect(await db.getBlob(done.pages[0].versions[0].blobId)).not.toBeNull();

    // Sequel keeps the cast and approved sheets; deleting the original keeps shared blobs.
    const seq = createSequel(st.id)!;
    expect(seq.characters[0].sheet.status).toBe('approved');
    await deleteStory(st.id);
    expect(storyById(st.id)).toBeUndefined();
    expect(await db.getBlob(seq.characters[0].sheet.versions[0].blobId)).not.toBeNull();
    expect(await db.getBlob(done.pages[0].versions[0].blobId)).toBeNull();

    // J7: delete my images removes reference uploads everywhere.
    await deleteAllReferenceImages();
    expect(getState().stories.every((s) => s.characters.every((x) => x.refs.length === 0))).toBe(true);
    expect(await db.blobIdsOfKind('reference')).toHaveLength(0);
  });

  it('marks pages failed when every step is refused, and recovers on redraw', async () => {
    const st = createStory();
    updateStory(st.id, (x) => ({ ...x, setup: { ...x.setup, desh: { main: 'Kashi', subs: [] }, katha: 'Plot.', pageCount: 6, format: 'single' }, characters: x.characters.map((c) => ({ ...c, name: 'Gauri', sheet: { ...c.sheet, status: 'approved' as const } })) }));
    await writeOutline(st.id);
    mockConfig.images = 'refused';
    startIllustrating(st.id);
    await until(() => storyById(st.id)!.pages.every((p) => p.status === 'failed'));
    expect(storyById(st.id)!.pages[0].error?.code).toBe('IMAGE_SAFETY');
    mockConfig.images = 'works';
    const { retryFailed } = await import('../state/store');
    retryFailed(st.id);
    await until(() => storyById(st.id)!.status === 'done');
  });
});
