import { COLORS, PURUSHARTHAS } from './constants';
import type { Character, Layout, Page, PageKind, Panel, PurusharthaKey, Role, Setup, Story } from './types';

export function uid(prefix: string): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rnd}`;
}

export const clean = (s: string | undefined | null) => (s || '').trim().replace(/[.!]+$/, '');
export const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
export const joinNames = (arr: string[]) => arr.join(', ').replace(/, ([^,]*)$/, ' & $1');

export function fmtSize(bytes: number): string {
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ago(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'Edited just now';
  if (m < 60) return `Edited ${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `Edited ${h} h ago`;
  return `Edited ${Math.round(h / 24)} d ago`;
}

export function emptyPurushartha(): Character['purushartha'] {
  const o = {} as Character['purushartha'];
  for (const p of PURUSHARTHAS) o[p.k] = { on: false, note: '' };
  return o;
}

export function newCharacter(role: Role, index: number, fields: Partial<Character> = {}): Character {
  return {
    id: uid('c'),
    name: '',
    age: '',
    gender: 'male',
    form: 'Human',
    role,
    isKey: role === 'nayak' || role === 'pratinayak',
    appearance: '',
    refs: [],
    purushartha: emptyPurushartha(),
    color: COLORS[index % COLORS.length],
    sheet: { status: 'none', versions: [], active: 0, error: '' },
    ...fields,
  };
}

export function blankSetup(): Setup {
  return {
    desh: { main: '', subs: [] },
    placeRefs: [],
    kaal: { era: 'Long, long ago', custom: '', ritu: '' },
    paristhiti: '',
    stakes: '',
    inspiration: ['Panchatantra'],
    katha: '',
    lesson: '',
    darshan: 'None',
    tone: 'Adventurous',
    age: '5–7',
    pageCount: 8,
    style: 'Comic',
    format: 'auto',
  };
}

export function newStory(): Story {
  const now = Date.now();
  return {
    id: uid('st'),
    title: 'Untitled katha',
    status: 'draft',
    setup: blankSetup(),
    characters: [newCharacter('nayak', 0)],
    pages: [],
    formatReason: '',
    createdAt: now,
    updatedAt: now,
  };
}

/** A sequel keeps desh, kaal, paatra and approved sheets, and clears the plot (backend-spec §4.7). */
export function sequelOf(base: Story): Story {
  const now = Date.now();
  return {
    ...base,
    id: uid('st'),
    title: `${base.title}: Part 2`,
    status: 'draft',
    setup: { ...base.setup, paristhiti: '', stakes: '', katha: '', lesson: '' },
    characters: base.characters.map((c) => ({ ...c, id: uid('c') })),
    pages: [],
    formatReason: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function kaalPhrase(k: Setup['kaal']): string {
  let s = k.custom && k.custom.trim()
    ? lowerFirst(clean(k.custom))
    : !k.era || k.era === 'Long, long ago' ? 'long, long ago'
      : k.era === 'Present day' ? 'not so long ago' : `in the ${k.era}`;
  if (k.ritu) s += `, in ${k.ritu.split(' · ')[0]}`;
  return s;
}

export function settingLine(setup: Setup): string {
  const subs = setup.desh.subs.filter((x) => x.trim());
  return `${clean(setup.desh.main) || '[no place yet]'}${subs.length ? ` (${subs.join(', ')})` : ''}, ${kaalPhrase(setup.kaal)}.`;
}

export function heroOf(chars: Character[]): Character | undefined {
  return chars.find((c) => c.role === 'nayak' && c.name.trim()) || chars.find((c) => c.name.trim());
}

/** Fields required before a story can be written (frontend-spec §3.8). */
export function missingForWriting(st: Story): string[] {
  const m: string[] = [];
  if (!clean(st.setup.desh.main)) m.push('the main place (Desh)');
  if (!st.characters.some((c) => c.role === 'nayak' && c.name.trim())) m.push('a named nayak (Paatra)');
  if (!clean(st.setup.katha)) m.push('the main plot (Katha)');
  return m;
}

/** Format auto-pick, exactly as backend-spec §4.2. */
export function chooseFormat(setup: Setup, chars: Character[]): { layout: Layout; reason: string } {
  if (setup.format === 'single') return { layout: 'caption', reason: 'Single scene on every page: one picture with a short caption below.' };
  if (setup.format === 'grid') return { layout: 'grid', reason: '3×2 comic grid: six panels per page, each with its own speech bubble.' };
  const keys = chars.filter((c) => c.isKey && c.name.trim()).length;
  const subs = setup.desh.subs.filter((x) => x.trim()).length;
  const len = setup.katha.length + setup.paristhiti.length;
  const score = keys + subs + (len > 420 ? 2 : len > 200 ? 1 : 0) + (setup.age === '7–10' ? 1 : 0);
  if (score >= 5) {
    return { layout: 'grid', reason: `Auto picked a 3×2 comic grid: ${keys} key characters, ${subs} sublocations and a detailed plot need room for dialogue.` };
  }
  return {
    layout: 'caption',
    reason: 'Auto picked a single scene per page: the story is simple enough for one picture and a short caption.'
      + (score >= 3 ? ' Add more detail or characters and it will switch to a 3×2 grid.' : ''),
  };
}

export function styleWord(style: string): string {
  return ({ Comic: 'Bold comic-book', Watercolour: 'Soft watercolour', Crayon: 'Hand-drawn crayon', 'Madhubani-inspired': 'Madhubani-inspired folk-art' } as Record<string, string>)[style] || 'Bold comic-book';
}

export function kindAt(i: number, total: number): PageKind {
  return i === 0 ? 'cover' : i === total - 1 ? 'end' : 'middle';
}

export function newPage(kind: PageKind, fields: Partial<Page> = {}): Page {
  return {
    id: uid('pg'),
    kind,
    caption: '',
    imagePrompt: '',
    layout: 'caption',
    location: '',
    bubble: '',
    panels: [],
    status: 'none',
    versions: [],
    activeVersionId: null,
    error: null,
    ...fields,
  };
}

/** Six blank panels with the standard shot list (backend-spec §4.2). */
export function blankPanels(st: Story, location: string): Panel[] {
  const hero = heroOf(st.characters);
  const other = st.characters.find((c) => c !== hero && c.name.trim());
  const A = hero?.name || 'the hero';
  const B = other?.name || 'a friend';
  const sw = styleWord(st.setup.style);
  const where = `${location || clean(st.setup.desh.main) || 'the scene'}, ${kaalPhrase(st.setup.kaal)}`;
  const shots = ['Wide establishing shot', `Close-up of ${A}, speaking`, `${B} replying`, `${A} and ${B} together`, 'Detail: an important object in the scene', `${A} making a decision`];
  return shots.map((shot) => ({ id: uid('pn'), prompt: `${sw} comic panel. ${shot}, ${where}.`, bubble: '', speakerId: '' }));
}

export function activeVersion(p: Page) {
  return p.versions.find((v) => v.id === p.activeVersionId) || p.versions[p.versions.length - 1];
}

export function pageLabel(p: Page, i: number): string {
  return p.kind === 'cover' ? 'Cover' : p.kind === 'end' ? 'Last page' : `Page ${i + 1}`;
}

export function starringLine(chars: Character[]): string {
  const names = chars.filter((c) => c.name.trim()).map((c) => c.name.trim());
  return names.length ? `Starring ${joinNames(names)}` : '';
}

/** Text for read-aloud: narration, then "Name says: bubble" for grid pages (frontend-spec §3.13). */
export function pageText(st: Story, i: number): string {
  const p = st.pages[i];
  if (!p) return '';
  if (p.kind === 'cover') return `${st.title}. ${starringLine(st.characters)}.`;
  if (p.kind === 'end') return `${p.caption} The End.`;
  let t = p.caption;
  if (p.layout === 'grid') {
    for (const pn of p.panels) {
      if (!pn.bubble.trim()) continue;
      const sp = st.characters.find((c) => c.id === pn.speakerId);
      t += ` ${sp ? `${sp.name} says: ` : ''}${pn.bubble}`;
    }
  } else if (p.bubble.trim()) {
    t = `${p.bubble} ${t}`;
  }
  return t;
}

export function drivesOf(c: Character): PurusharthaKey[] {
  return (Object.keys(c.purushartha) as PurusharthaKey[]).filter((k) => c.purushartha[k]?.on);
}
