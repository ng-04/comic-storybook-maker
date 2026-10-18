// Phase 1 client: the browser calls Claude and Gemini directly with the user's own keys.

import { FALLBACK_NOTES } from '../domain/constants';
import { blankPanels, kindAt, uid } from '../domain/model';
import type { Character, Panel, Story } from '../domain/types';
import { db } from '../state/db';
import { claudeJson } from './claude';
import { blobToInline, drawWithLadder, type Aspect, type InlineImage, type Rung } from './gemini';
import { charactersOnPage, OUTLINE_SCHEMA, outlinePrompt, REWRITE_SCHEMA, rewritePrompt, scenePrompt, sheetPrompt, STORY_SYSTEM } from './prompts';
import { ApiError, type ImageResult, type OutlinePage, type OutlineResult, type PageImageResult, type RewriteResult, type StoryApi } from './types';

interface RawPanel { prompt: string; bubble: string; speaker: string }
interface RawPage { caption: string; imagePrompt: string; location: string; bubble: string; panels: RawPanel[] }
interface RawOutline { title: string; pages: RawPage[] }

const MAX_REF_IMAGES = 4;

function toPanels(raw: RawPanel[], st: Story): Panel[] {
  const byName = (n: string) => st.characters.find((c) => c.name.trim() && c.name.trim().toLowerCase() === n.trim().toLowerCase());
  return raw.slice(0, 6).map((p) => ({ id: uid('pn'), prompt: p.prompt, bubble: p.bubble || '', speakerId: (p.bubble && byName(p.speaker || '')?.id) || '' }));
}

async function loadImages(blobIds: string[]): Promise<InlineImage[]> {
  const out: InlineImage[] = [];
  for (const id of blobIds) {
    const b = await db.getBlob(id);
    if (b) out.push(await blobToInline(b));
  }
  return out;
}

function approvedSheet(c: Character): string | null {
  const v = c.sheet.versions[c.sheet.active];
  return c.sheet.status === 'approved' && v ? v.blobId : null;
}

export const directApi: StoryApi = {
  mode: 'direct',

  async writeOutline(st, signal): Promise<OutlineResult> {
    const { text, layout, reason } = outlinePrompt(st);
    const n = st.setup.pageCount;
    let lastErr: ApiError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await claudeJson<RawOutline>({ system: STORY_SYSTEM, prompt: text, schema: OUTLINE_SCHEMA, maxTokens: 32000, signal });
      const pages = raw.pages || [];
      const gridOk = layout !== 'grid' || pages.slice(1, -1).every((p) => (p.panels || []).length >= 6);
      if (pages.length === n && gridOk) {
        const out: OutlinePage[] = pages.map((p, i) => {
          const kind = kindAt(i, n);
          const isGrid = kind === 'middle' && layout === 'grid';
          return {
            kind,
            caption: i === 0 ? (raw.title || p.caption) : p.caption,
            imagePrompt: p.imagePrompt,
            layout: kind === 'middle' ? layout : 'caption',
            location: p.location || '',
            bubble: isGrid || kind !== 'middle' ? '' : p.bubble || '',
            panels: isGrid ? toPanels(p.panels, st) : [],
          };
        });
        return { title: raw.title || out[0].caption, formatReason: reason, pages: out };
      }
      lastErr = new ApiError('GENERATION_INVALID', `The story came back with ${pages.length} pages instead of ${n}.`);
    }
    throw lastErr!;
  },

  async rewritePage(st, pageId, signal): Promise<RewriteResult> {
    const p = st.pages.find((x) => x.id === pageId);
    if (!p) throw new ApiError('INTERNAL', 'That page no longer exists.');
    const raw = await claudeJson<RawPage>({ system: STORY_SYSTEM, prompt: rewritePrompt(st, pageId), schema: REWRITE_SCHEMA, maxTokens: 8000, signal });
    const isGrid = p.kind === 'middle' && p.layout === 'grid';
    let panels = isGrid ? toPanels(raw.panels || [], st) : [];
    if (isGrid && panels.length < 6) panels = panels.concat(blankPanels(st, p.location).slice(panels.length));
    return {
      caption: p.kind === 'cover' ? p.caption : raw.caption,
      imagePrompt: raw.imagePrompt || p.imagePrompt,
      bubble: isGrid || p.kind !== 'middle' ? '' : raw.bubble || '',
      panels,
    };
  },

  async drawSheet(st, c, signal): Promise<ImageResult> {
    const photos = await loadImages(c.refs.slice(0, 2).map((r) => r.blobId));
    const rungs: Rung[] = [];
    if (photos.length) rungs.push({ text: sheetPrompt(st, c, true), images: photos, note: '', step: 1 });
    rungs.push({ text: sheetPrompt(st, c, false), images: [], note: photos.length ? FALLBACK_NOTES.sheetNoPhoto : '', step: photos.length ? 2 : 1 });
    return drawWithLadder(rungs, '4:3', signal);
  },

  async drawPage(st, pageId, signal): Promise<PageImageResult> {
    const p = st.pages.find((x) => x.id === pageId);
    if (!p) throw new ApiError('INTERNAL', 'That page no longer exists.');
    const cast = charactersOnPage(st, p);
    const withSheets = cast.filter((c) => approvedSheet(c)).slice(0, MAX_REF_IMAGES);
    const sheetImgs = await loadImages(withSheets.map((c) => approvedSheet(c)!));
    const room = Math.max(0, MAX_REF_IMAGES - sheetImgs.length);
    const photoIds = cast.flatMap((c) => c.refs.map((r) => r.blobId)).slice(0, Math.min(room, 2));
    const photoImgs = await loadImages(photoIds);
    const placeImgs = await loadImages(st.setup.placeRefs.slice(0, Math.max(0, room - photoImgs.length)).map((r) => r.blobId));
    const sheetNames = withSheets.map((c) => c.name.trim());

    const ladder = (scene: string): Rung[] => {
      const rungs: Rung[] = [];
      const hasPhotos = photoImgs.length + placeImgs.length > 0;
      if (hasPhotos) {
        rungs.push({
          text: scenePrompt(st, p, scene, cast, { sheets: sheetNames, photos: photoImgs.length > 0, places: placeImgs.length > 0 }),
          images: [...sheetImgs, ...photoImgs, ...placeImgs], note: '', step: 1,
        });
      }
      if (sheetImgs.length) {
        rungs.push({
          text: scenePrompt(st, p, scene, cast, { sheets: sheetNames, photos: false, places: false }),
          images: sheetImgs, note: hasPhotos ? FALLBACK_NOTES.pageNoPhoto : '', step: hasPhotos ? 2 : 1,
        });
      }
      rungs.push({
        text: scenePrompt(st, p, scene, cast, { sheets: [], photos: false, places: false }),
        images: [], note: rungs.length ? FALLBACK_NOTES.textOnly : '', step: rungs.length ? 3 : 1,
      });
      return rungs;
    };

    const isGrid = p.kind === 'middle' && p.layout === 'grid';
    if (!isGrid) {
      const aspect: Aspect = p.layout === 'full' ? '3:4' : '4:5';
      const image = await drawWithLadder(ladder(p.imagePrompt), aspect, signal);
      return { image, panels: [], note: image.note, step: image.step };
    }
    // If one panel fails for good, stop the others so they don't keep spending.
    const group = new AbortController();
    signal?.addEventListener('abort', () => group.abort(), { once: true });
    const panels = await Promise.all(p.panels.slice(0, 6).map((pn) => drawWithLadder(ladder(pn.prompt || p.imagePrompt), '5:4', group.signal)
      .catch((e) => { group.abort(); throw e; })));
    const worst = panels.reduce((a, b) => (b.step > a.step ? b : a), panels[0]);
    return { image: null, panels, note: worst?.note || '', step: worst?.step || 1 };
  },
};
