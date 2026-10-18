// IndexedDB storage for Phase 1: storybooks (JSON) and images (Blobs) live only in this browser.
// Phase 2 replaces this with DynamoDB + S3 behind the API; screens never touch this file directly.

import type { Story } from '../domain/types';

const DB_NAME = 'comic-storybook-maker';
const DB_VERSION = 1;
const STORIES = 'stories';
const BLOBS = 'blobs';

/** Why an image blob exists: reference photos are private and deletable as a group (J7). */
export type BlobKind = 'reference' | 'sheet' | 'page' | 'panel';

interface BlobRecord {
  id: string;
  kind: BlobKind;
  blob: Blob;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORIES)) db.createObjectStore(STORIES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS, { keyPath: 'id' }).createIndex('kind', 'kind');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const db = {
  listStories: () => run<Story[]>(STORIES, 'readonly', (s) => s.getAll() as IDBRequest<Story[]>),
  putStory: (story: Story) => run(STORIES, 'readwrite', (s) => s.put(story)),
  deleteStory: (id: string) => run(STORIES, 'readwrite', (s) => s.delete(id)),

  putBlob: (id: string, kind: BlobKind, blob: Blob) => run(BLOBS, 'readwrite', (s) => s.put({ id, kind, blob } satisfies BlobRecord)),
  getBlob: async (id: string): Promise<Blob | null> => {
    const rec = await run<BlobRecord | undefined>(BLOBS, 'readonly', (s) => s.get(id) as IDBRequest<BlobRecord | undefined>);
    return rec ? rec.blob : null;
  },
  deleteBlob: (id: string) => run(BLOBS, 'readwrite', (s) => s.delete(id)),
  blobIdsOfKind: (kind: BlobKind) => run<IDBValidKey[]>(BLOBS, 'readonly', (s) => s.index('kind').getAllKeys(kind)),
};

// ---- object URLs for <img> tags, created once per blob per session ----
const urlCache = new Map<string, Promise<string>>();

export function blobUrl(id: string): Promise<string> {
  let p = urlCache.get(id);
  if (!p) {
    p = db.getBlob(id).then((b) => (b ? URL.createObjectURL(b) : ''));
    urlCache.set(id, p);
  }
  return p;
}

export function forgetBlobUrl(id: string) {
  const p = urlCache.get(id);
  urlCache.delete(id);
  p?.then((u) => u && URL.revokeObjectURL(u));
}
