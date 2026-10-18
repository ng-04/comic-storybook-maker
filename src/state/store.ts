// App state: storybooks (persisted to IndexedDB), plus runtime state that is never saved
// (running jobs, toasts, dialogs). Screens read with useStore() and call the actions below.

import { useSyncExternalStore } from 'react';
import { api, asApiError, type ApiError } from '../api';
import { MAX_PAGES } from '../domain/constants';
import { blankPanels, chooseFormat, isSimple, newCharacter, newPage, newSimpleStory, newStory, sequelOf, simpleCharacters, uid } from '../domain/model';
import type { Character, Layout, Mode, Page, RefImage, Role, SimpleInput, Story } from '../domain/types';
import { db, forgetBlobUrl, type BlobKind } from './db';
import { prepareImage } from './images';

export interface Toast {
  id: string;
  text: string;
  kind: 'info' | 'warn';
  action?: { label: string; run: () => void };
}

export interface Confirm {
  title: string;
  body: string;
  yes: string;
  run: () => void;
}

export interface WritingJob {
  startedAt: number;
  error: string | null;
}

export interface State {
  loaded: boolean;
  loadError: string | null;
  stories: Story[];
  saveState: 'saved' | 'saving' | 'error';
  online: boolean;
  writing: Record<string, WritingJob>;
  rewriting: Record<string, boolean>;
  toasts: Toast[];
  confirm: Confirm | null;
}

let state: State = {
  loaded: false, loadError: null, stories: [], saveState: 'saved',
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  writing: {}, rewriting: {}, toasts: [], confirm: null,
};
const listeners = new Set<() => void>();

function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function useStore(): State {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getState);
}

export function storyById(id: string | undefined): Story | undefined {
  return id ? state.stories.find((s) => s.id === id) : undefined;
}

// ---------------- persistence ----------------

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingSaves = new Set<string>();

function scheduleSave(id: string) {
  clearTimeout(saveTimers.get(id));
  pendingSaves.add(id);
  if (state.saveState !== 'saving') set({ saveState: 'saving' });
  saveTimers.set(id, setTimeout(() => {
    const st = storyById(id);
    const done = () => { pendingSaves.delete(id); if (!pendingSaves.size) set({ saveState: 'saved' }); };
    if (!st) return done();
    db.putStory(st).then(done, () => { pendingSaves.delete(id); set({ saveState: 'error' }); });
  }, 400));
}

/** Pages or sheets that were mid-draw when the tab closed go back to a safe state. */
function revive(st: Story): Story {
  return {
    ...st,
    pages: st.pages.map((p) => (p.status === 'drawing' ? { ...p, status: 'queued' } : p)),
    characters: st.characters.map((c) => (c.sheet.status === 'drawing'
      ? { ...c, sheet: { ...c.sheet, status: c.sheet.versions.length ? 'review' : 'none' } } : c)),
  };
}

export async function loadLibrary() {
  set({ loadError: null });
  try {
    const list = (await db.listStories()).map(revive);
    // Keep in-memory copies that are newer than storage (edits not yet flushed by scheduleSave).
    set((s) => {
      const byId = new Map(list.map((x) => [x.id, x]));
      for (const mem of s.stories) {
        const saved = byId.get(mem.id);
        if (!saved || saved.updatedAt <= mem.updatedAt) byId.set(mem.id, mem);
      }
      return { stories: [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt), loaded: true };
    });
  } catch (e) {
    set({ loadError: asApiError(e).message, loaded: true });
  }
}

export function updateStory(id: string, fn: (s: Story) => Story) {
  set((s) => ({ stories: s.stories.map((st) => (st.id === id ? { ...fn(st), updatedAt: Date.now() } : st)) }));
  scheduleSave(id);
}

export function updatePage(storyId: string, pageId: string, patch: Partial<Page> | ((p: Page) => Partial<Page>)) {
  updateStory(storyId, (st) => ({ ...st, pages: st.pages.map((p) => (p.id === pageId ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p)) }));
}

export function updateChar(storyId: string, charId: string, patch: Partial<Character> | ((c: Character) => Partial<Character>)) {
  updateStory(storyId, (st) => ({ ...st, characters: st.characters.map((c) => (c.id === charId ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)) }));
}

// ---------------- toasts & dialogs ----------------

export function toast(text: string, kind: Toast['kind'] = 'info', action?: Toast['action']) {
  const id = uid('t');
  set((s) => ({ toasts: s.toasts.concat([{ id, text, kind, action }]).slice(-4) }));
  setTimeout(() => dismissToast(id), action ? 7000 : 4200);
}
export function dismissToast(id: string) {
  set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}
export function askConfirm(c: Confirm) {
  set({ confirm: c });
}
export function closeConfirm() {
  set({ confirm: null });
}

// ---------------- library ----------------

export function createStory(mode: Mode = 'advanced'): Story {
  const st = mode === 'simple' ? newSimpleStory() : newStory();
  set((s) => ({ stories: [st, ...s.stories] }));
  scheduleSave(st.id);
  return st;
}

export function createSequel(baseId: string): Story | undefined {
  const base = storyById(baseId);
  if (!base) return undefined;
  const st = sequelOf(base);
  set((s) => ({ stories: [st, ...s.stories] }));
  scheduleSave(st.id);
  toast(isSimple(st) ? 'Sequel started with the same characters. Write a new story idea.' : 'Sequel started: same desh, kaal and paatra. Set the new paristhiti.');
  return st;
}

function blobIdsOf(st: Story): string[] {
  return [
    ...st.setup.placeRefs.map((r) => r.blobId),
    st.simple?.photo?.blobId || '',
    ...st.characters.flatMap((c) => [...c.refs.map((r) => r.blobId), ...c.sheet.versions.map((v) => v.blobId)]),
    ...st.pages.flatMap((p) => p.versions.flatMap((v) => [v.blobId, ...v.panelBlobIds])),
  ].filter(Boolean);
}

export async function deleteStory(id: string) {
  const st = storyById(id);
  if (!st) return;
  stopIllustrating(id);
  set((s) => ({ stories: s.stories.filter((x) => x.id !== id) }));
  // Sequels share sheet and reference blobs with their originals; only delete unused ones.
  const stillUsed = new Set(state.stories.flatMap(blobIdsOf));
  await db.deleteStory(id);
  for (const b of blobIdsOf(st)) {
    if (!stillUsed.has(b)) { forgetBlobUrl(b); await db.deleteBlob(b); }
  }
  toast('Storybook deleted.');
}

// ---------------- reference images ----------------

export type RefTarget = { type: 'place' } | { type: 'char'; id: string };

function updateRefs(storyId: string, target: RefTarget, fn: (rs: RefImage[]) => RefImage[]) {
  if (target.type === 'place') updateStory(storyId, (st) => ({ ...st, setup: { ...st.setup, placeRefs: fn(st.setup.placeRefs) } }));
  else updateChar(storyId, target.id, (c) => ({ refs: fn(c.refs) }));
}

export async function addRefFiles(storyId: string, target: RefTarget, files: File[]) {
  if (files.length > 8) toast('Up to 8 images at a time.', 'warn');
  for (const file of files.slice(0, 8)) {
    if (file.size > 10 * 1048576) { toast(`${file.name} is over 10 MB. Try a smaller one.`, 'warn'); continue; }
    try {
      const blob = await prepareImage(file);
      const blobId = uid('img');
      await db.putBlob(blobId, 'reference', blob);
      updateRefs(storyId, target, (rs) => rs.concat([{ id: uid('r'), name: file.name, size: blob.size, blobId, mime: blob.type }]));
    } catch {
      toast(`Couldn't add ${file.name}.`, 'warn');
    }
  }
}

export async function removeRef(storyId: string, target: RefTarget, ref: RefImage) {
  updateRefs(storyId, target, (rs) => rs.filter((r) => r.id !== ref.id));
  // A sequel shares reference images with its original; keep the file while another book uses it.
  if (!state.stories.some((x) => blobIdsOf(x).includes(ref.blobId))) {
    forgetBlobUrl(ref.blobId);
    await db.deleteBlob(ref.blobId);
  }
  toast(`${ref.name} deleted.`);
}

/** J7: every reference image in every book is deleted; sheets and drawn pages stay. */
export async function deleteAllReferenceImages() {
  const ids = (await db.blobIdsOfKind('reference')) as string[];
  for (const id of ids) { forgetBlobUrl(id); await db.deleteBlob(id); }
  for (const st of state.stories) {
    updateStory(st.id, (x) => ({
      ...x,
      setup: { ...x.setup, placeRefs: [] },
      characters: x.characters.map((c) => ({ ...c, refs: [] })),
      simple: x.simple ? { ...x.simple, photo: null } : undefined,
    }));
  }
  toast('All reference images deleted.');
}

// ---------------- simple mode ----------------

export function updateSimple(storyId: string, patch: Partial<SimpleInput>) {
  updateStory(storyId, (st) => ({ ...st, simple: { ...(st.simple as SimpleInput), ...patch } }));
}

export async function setSimplePhoto(storyId: string, file: File) {
  if (file.size > 10 * 1048576) { toast(`${file.name} is over 10 MB. Try a smaller one.`, 'warn'); return; }
  const old = storyById(storyId)?.simple?.photo;
  try {
    const blob = await prepareImage(file);
    const blobId = uid('img');
    await db.putBlob(blobId, 'reference', blob);
    updateSimple(storyId, { photo: { id: uid('r'), name: file.name, size: blob.size, blobId, mime: blob.type } });
    if (old) await removeOrphan(old.blobId);
  } catch {
    toast(`Couldn't add ${file.name}.`, 'warn');
  }
}

export async function removeSimplePhoto(storyId: string) {
  const old = storyById(storyId)?.simple?.photo;
  updateSimple(storyId, { photo: null });
  if (old) await removeOrphan(old.blobId);
}

async function removeOrphan(blobId: string) {
  if (!state.stories.some((x) => blobIdsOf(x).includes(blobId))) {
    forgetBlobUrl(blobId);
    await db.deleteBlob(blobId);
  }
}

// ---------------- paatra ----------------

export function addCharacter(storyId: string, role: Role) {
  updateStory(storyId, (st) => ({ ...st, characters: st.characters.concat([newCharacter(role, st.characters.length)]) }));
}

export function removeCharacter(storyId: string, c: Character) {
  const st = storyById(storyId);
  if (!st) return;
  const idx = st.characters.findIndex((x) => x.id === c.id);
  updateStory(storyId, (x) => ({ ...x, characters: x.characters.filter((y) => y.id !== c.id) }));
  toast(`${c.name || 'Character'} removed.`, 'info', {
    label: 'Undo',
    run: () => updateStory(storyId, (x) => { const cs = x.characters.slice(); cs.splice(idx, 0, c); return { ...x, characters: cs }; }),
  });
}

async function saveImage(kind: BlobKind, blob: Blob): Promise<string> {
  const id = uid('img');
  await db.putBlob(id, kind, blob);
  return id;
}

export async function drawSheet(storyId: string, charId: string) {
  const st = storyById(storyId);
  const c = st?.characters.find((x) => x.id === charId);
  if (!st || !c) return;
  if (!c.name.trim() && !c.appearance.trim()) { toast('Add a name or a short description first.', 'warn'); return; }
  if (!state.online) { toast("You're offline. Try again when you're back.", 'warn'); return; }
  updateChar(storyId, charId, (x) => ({ sheet: { ...x.sheet, status: 'drawing', error: '' } }));
  try {
    const res = await api().drawSheet(st, c);
    const blobId = await saveImage('sheet', res.blob);
    updateChar(storyId, charId, (x) => {
      const versions = x.sheet.versions.concat([{ id: uid('v'), blobId, note: res.note }]);
      return { sheet: { status: 'review', versions, active: versions.length - 1, error: '' } };
    });
  } catch (e) {
    const err = asApiError(e);
    updateChar(storyId, charId, (x) => ({ sheet: { ...x.sheet, status: x.sheet.versions.length ? 'review' : 'failed', error: err.message } }));
    if (c.sheet.versions.length) toast('The new sheet failed. Your earlier one is kept.', 'warn');
  }
}

export function approveSheet(storyId: string, c: Character) {
  updateChar(storyId, c.id, (x) => ({ sheet: { ...x.sheet, status: 'approved' } }));
  toast(`${c.name || 'Character'}'s sheet approved. It'll guide every page.`);
}

// ---------------- writing the outline ----------------

const writeControllers = new Map<string, AbortController>();

function setWriting(storyId: string, job: WritingJob | null) {
  set((s) => {
    const writing = { ...s.writing };
    if (job) writing[storyId] = job; else delete writing[storyId];
    return { writing };
  });
}

/** Resolves true when the outline is ready. */
export async function writeOutline(storyId: string): Promise<boolean> {
  const st = storyById(storyId);
  if (!st) return false;
  writeControllers.get(storyId)?.abort();
  const ctrl = new AbortController();
  writeControllers.set(storyId, ctrl);
  setWriting(storyId, { startedAt: Date.now(), error: null });
  try {
    const res = await api().writeOutline(st, ctrl.signal);
    if (ctrl.signal.aborted) return false;
    stopIllustrating(storyId);
    updateStory(storyId, (x) => ({
      ...x,
      ...(isSimple(x) ? { characters: simpleCharacters(x.simple!), simple: { ...x.simple!, characters: res.characterNotes || '' } } : {}),
      title: res.title,
      status: 'outline',
      formatReason: res.formatReason,
      pages: res.pages.map((p) => newPage(p.kind, { caption: p.caption, imagePrompt: p.imagePrompt, layout: p.layout, location: p.location, bubble: p.bubble, panels: p.panels })),
    }));
    setWriting(storyId, null);
    return true;
  } catch (e) {
    const err = asApiError(e);
    if (err.code === 'CANCELLED') return false;
    setWriting(storyId, { startedAt: state.writing[storyId]?.startedAt || Date.now(), error: err.message });
    return false;
  } finally {
    if (writeControllers.get(storyId) === ctrl) writeControllers.delete(storyId);
  }
}

export function cancelWriting(storyId: string) {
  writeControllers.get(storyId)?.abort();
  writeControllers.delete(storyId);
  setWriting(storyId, null);
  toast('Story writing cancelled. Everything you set up is kept.');
}

// ---------------- outline editing ----------------

export function movePage(storyId: string, pageId: string, dir: -1 | 1) {
  updateStory(storyId, (st) => {
    const ps = st.pages.slice();
    const i = ps.findIndex((p) => p.id === pageId);
    const j = i + dir;
    if (j < 1 || j > ps.length - 2) return st;
    [ps[i], ps[j]] = [ps[j], ps[i]];
    return { ...st, pages: ps };
  });
}

export function deletePage(storyId: string, pageId: string) {
  const st = storyById(storyId);
  if (!st) return;
  const i = st.pages.findIndex((p) => p.id === pageId);
  const pg = st.pages[i];
  updateStory(storyId, (x) => ({ ...x, pages: x.pages.filter((p) => p.id !== pageId) }));
  toast('Page deleted.', 'info', {
    label: 'Undo',
    run: () => updateStory(storyId, (x) => { const ps = x.pages.slice(); ps.splice(i, 0, pg); return { ...x, pages: ps }; }),
  });
}

export function addPageAfter(storyId: string, pageId: string) {
  const st = storyById(storyId);
  if (!st || st.pages.length >= MAX_PAGES) return;
  const i = st.pages.findIndex((p) => p.id === pageId);
  const fmt = chooseFormat(st.setup, st.characters);
  const location = st.setup.desh.subs[0] || st.setup.desh.main;
  const fresh = newPage('middle', { layout: fmt.layout, location, panels: fmt.layout === 'grid' ? blankPanels(st, location) : [] });
  updateStory(storyId, (x) => { const ps = x.pages.slice(); ps.splice(i + 1, 0, fresh); return { ...x, pages: ps }; });
}

export function setLayout(storyId: string, pageId: string, layout: Layout) {
  const st = storyById(storyId);
  if (!st) return;
  updatePage(storyId, pageId, (p) => ({ layout, panels: layout === 'grid' && !p.panels.length ? blankPanels(st, p.location) : p.panels }));
}

export async function rewritePage(storyId: string, pageId: string) {
  const st = storyById(storyId);
  if (!st) return;
  set((s) => ({ rewriting: { ...s.rewriting, [pageId]: true } }));
  try {
    const res = await api().rewritePage(st, pageId);
    updatePage(storyId, pageId, (p) => ({ caption: res.caption, imagePrompt: res.imagePrompt, bubble: res.bubble, panels: res.panels.length ? res.panels : p.panels }));
  } catch (e) {
    const err = asApiError(e);
    toast(err.code === 'OFFLINE' ? "You're offline. Rewrite needs a connection." : `Couldn't rewrite that page. ${err.message}`, 'warn');
  } finally {
    set((s) => { const r = { ...s.rewriting }; delete r[pageId]; return { rewriting: r }; });
  }
}

// ---------------- illustration queue (client-driven, frontend-spec §3.11) ----------------

const drawControllers = new Map<string, AbortController>();
const PAGE_CONCURRENCY = 3;

export function pendingSheets(st: Story): Character[] {
  if (isSimple(st)) return [];
  return st.characters.filter((c) => c.name.trim() && c.sheet.status !== 'approved');
}

export function startIllustrating(storyId: string) {
  updateStory(storyId, (st) => ({
    ...st,
    status: 'illustrating',
    pages: st.pages.map((p) => (p.status === 'done' || p.status === 'drawing' ? p : { ...p, status: 'queued', error: null })),
  }));
  pump(storyId);
}

export function retryFailed(storyId: string) {
  updateStory(storyId, (st) => ({ ...st, status: 'illustrating', pages: st.pages.map((p) => (p.status === 'failed' ? { ...p, status: 'queued', error: null } : p)) }));
  pump(storyId);
}

export function stopIllustrating(storyId: string) {
  const st = storyById(storyId);
  st?.pages.forEach((p) => { drawControllers.get(p.id)?.abort(); drawControllers.delete(p.id); });
}

export function pump(storyId: string) {
  const st = storyById(storyId);
  if (!st || !state.online) return;
  const ps = st.pages;
  const drawing = ps.filter((p) => p.status === 'drawing').length;
  const cover = ps[0];
  if (cover?.status === 'queued') { if (drawing === 0) void drawPage(storyId, cover.id); return; }
  if (cover?.status === 'drawing') return;
  ps.filter((p) => p.status === 'queued').slice(0, Math.max(0, PAGE_CONCURRENCY - drawing)).forEach((p) => void drawPage(storyId, p.id));
  const busy = ps.some((p) => p.status === 'queued' || p.status === 'drawing');
  if (!busy && st.status === 'illustrating') {
    const failed = ps.filter((p) => p.status === 'failed').length;
    if (!failed && ps.every((p) => p.versions.length)) {
      updateStory(storyId, (x) => ({ ...x, status: 'done' }));
      toast('All pictures are drawn. Your book is ready!', 'info', { label: 'Read it', run: () => { location.hash = `#/s/${storyId}/read`; } });
    } else if (failed) {
      toast(`${failed} ${failed === 1 ? 'page needs' : 'pages need'} a new prompt.`, 'warn');
    }
  }
}

export async function drawPage(storyId: string, pageId: string) {
  const st = storyById(storyId);
  const pg = st?.pages.find((p) => p.id === pageId);
  if (!st || !pg || pg.status === 'drawing') return;
  if (!state.online) { toast("You're offline. Drawing will resume when you're back.", 'warn'); return; }
  const ctrl = new AbortController();
  drawControllers.set(pageId, ctrl);
  updatePage(storyId, pageId, { status: 'drawing', error: null });
  if (st.status === 'done') updateStory(storyId, (x) => ({ ...x, status: 'illustrating' }));
  try {
    const res = await api().drawPage(st, pageId, ctrl.signal);
    const blobId = res.image ? await saveImage('page', res.image.blob) : '';
    const panelBlobIds: string[] = [];
    for (const pn of res.panels) panelBlobIds.push(await saveImage('panel', pn.blob));
    const v = { id: uid('v'), blobId, panelBlobIds, note: res.note, step: res.step, at: Date.now() };
    updatePage(storyId, pageId, (p) => ({ status: 'done', versions: p.versions.concat([v]), activeVersionId: v.id, error: null }));
  } catch (e) {
    const err: ApiError = asApiError(e);
    if (err.code === 'CANCELLED') {
      if (storyById(storyId)?.pages.some((p) => p.id === pageId)) updatePage(storyId, pageId, (p) => ({ status: p.versions.length ? 'done' : 'none' }));
      return;
    }
    const offline = err.code === 'OFFLINE';
    // A failed redraw keeps the earlier picture on screen; the error stays on the page for the editor.
    updatePage(storyId, pageId, (p) => ({
      status: offline ? 'queued' : p.versions.length ? 'done' : 'failed',
      error: offline ? null : { code: err.code, message: err.message },
    }));
    if (err.code === 'AUTH' || err.code === 'NO_KEY') toast(err.message, 'warn');
  } finally {
    drawControllers.delete(pageId);
    pump(storyId);
  }
}

// ---------------- online / offline ----------------

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    set({ online: true });
    state.stories.filter((s) => s.status === 'illustrating').forEach((s) => pump(s.id));
  });
  window.addEventListener('offline', () => set({ online: false }));
}
