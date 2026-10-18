// Data model for a storybook. Mirrors the shapes in docs/backend-spec.md §2 closely enough that the
// Phase 2 HTTP client can map to them, but images are stored as local blob ids (Phase 1 keeps
// everything in the browser's IndexedDB).

export type StoryStatus = 'draft' | 'outline' | 'illustrating' | 'done';
export type Gender = 'male' | 'female';
export type Form = 'Human' | 'Animal' | 'Bird' | 'Divine being';
export type Role = 'nayak' | 'sahayak' | 'mitra' | 'guru' | 'parivaar' | 'pratinayak';
export type PurusharthaKey = 'Dharma' | 'Artha' | 'Kaam' | 'Moksh';
export type FormatChoice = 'auto' | 'single' | 'grid';
export type Layout = 'caption' | 'full' | 'grid';
export type PageKind = 'cover' | 'middle' | 'end';
export type PageStatus = 'none' | 'queued' | 'drawing' | 'done' | 'failed';
export type SheetStatus = 'none' | 'drawing' | 'review' | 'approved' | 'failed';
export type Paper = 'a4' | 'letter';

/** A reference image the user uploaded (photo of a child, a temple, a painting style…). */
export interface RefImage {
  id: string;
  name: string;
  size: number;
  /** Key of the image blob in IndexedDB. */
  blobId: string;
  mime: string;
}

export interface Setup {
  desh: { main: string; subs: string[] };
  placeRefs: RefImage[];
  kaal: { era: string; custom: string; ritu: string };
  paristhiti: string;
  stakes: string;
  inspiration: string[];
  katha: string;
  lesson: string;
  darshan: string;
  tone: string;
  age: string;
  pageCount: number;
  style: string;
  format: FormatChoice;
}

export interface SheetVersion {
  id: string;
  blobId: string;
  note: string;
}

export interface Character {
  id: string;
  name: string;
  age: string;
  gender: Gender;
  form: Form;
  role: Role;
  isKey: boolean;
  appearance: string;
  refs: RefImage[];
  purushartha: Record<PurusharthaKey, { on: boolean; note: string }>;
  color: string;
  sheet: {
    status: SheetStatus;
    versions: SheetVersion[];
    /** Index into versions of the sheet shown (and approved). */
    active: number;
    error: string;
  };
}

export interface Panel {
  id: string;
  prompt: string;
  bubble: string;
  /** Character id, or '' for the narrator / no speaker. */
  speakerId: string;
}

export interface PageVersion {
  id: string;
  /** Single image for caption/full pages; empty for grid pages. */
  blobId: string;
  /** Six panel images for grid pages. */
  panelBlobIds: string[];
  note: string;
  /** 1 = with references, 2 = without photo references, 3 = text only. */
  step: number;
  at: number;
}

export interface Page {
  id: string;
  kind: PageKind;
  caption: string;
  imagePrompt: string;
  layout: Layout;
  location: string;
  bubble: string;
  panels: Panel[];
  status: PageStatus;
  versions: PageVersion[];
  activeVersionId: string | null;
  error: { code: string; message: string } | null;
}

export type Mode = 'simple' | 'advanced';

/** Inputs of the Simple mode form (works like v1: one form, then straight to pictures). */
export interface SimpleInput {
  hero: string;
  age: string;
  gender: 'boy' | 'girl' | 'child';
  others: string;
  idea: string;
  tone: string;
  pages: number;
  photo: RefImage | null;
  /** Claude's consistent visual description of every character, used in each image prompt. */
  characters: string;
}

export interface Story {
  id: string;
  /** Missing on books made before modes existed: those are advanced. */
  mode?: Mode;
  simple?: SimpleInput;
  title: string;
  status: StoryStatus;
  setup: Setup;
  characters: Character[];
  pages: Page[];
  formatReason: string;
  createdAt: number;
  updatedAt: number;
}
