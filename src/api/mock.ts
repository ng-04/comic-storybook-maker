// Demo mode (frontend-spec §7): no keys, simulated stories and pictures with realistic delays,
// refusals and fallback notes. Also what the tests run against.

import { FALLBACK_NOTES } from '../domain/constants';
import { blankPanels, chooseFormat, clean, heroOf, isSimple, kaalPhrase, kindAt, lowerFirst, styleWord, uid } from '../domain/model';
import type { Character, Story } from '../domain/types';
import { ApiError, type ImageResult, type OutlinePage, type OutlineResult, type PageImageResult, type RewriteResult, type StoryApi } from './types';

export type MockImageMode = 'works' | 'realistic' | 'refused';
export const mockConfig = { images: 'realistic' as MockImageMode, storyFails: false, speed: 1 };

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms * mockConfig.speed);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new ApiError('CANCELLED', 'Cancelled.')); }, { once: true });
  });
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** A simple placeholder scene (sky, sun, hills and round figures). Never contains text. */
export function mockArt(seed: string, colors: string[], w = 400, h = 300): Blob {
  const r = hash(seed);
  const skies = ['#7FB2FF', '#8FD3A8', '#FFC98B', '#C9DDF2', '#FFB8CC', '#9BE3D6'];
  const sky = skies[r % skies.length];
  const hill = ['#6BBF59', '#8FCB5A', '#C9A15B'][(r >> 3) % 3];
  const sunX = w * (0.6 + ((r >> 5) % 30) / 100);
  const figs = (colors.length ? colors : ['#1F4FB8']).slice(0, 3).map((c, i) => {
    const x = w * (0.28 + i * 0.22);
    const y = h * 0.82;
    return `<g transform="translate(${x} ${y})"><path d="M-22 0 Q-24 -58 0 -60 Q24 -58 22 0 Z" fill="${c}" stroke="#141414" stroke-width="5"/><circle cy="-80" r="21" fill="#F2CFAE" stroke="#141414" stroke-width="5"/><circle cx="-7" cy="-82" r="3" fill="#141414"/><circle cx="7" cy="-82" r="3" fill="#141414"/><path d="M-7 -72 Q0 -66 7 -72" fill="none" stroke="#141414" stroke-width="3" stroke-linecap="round"/></g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${sky}"/><circle cx="${sunX}" cy="${h * 0.22}" r="${h * 0.11}" fill="#FFD93B" stroke="#141414" stroke-width="5"/><path d="M0 ${h * 0.7} Q${w * 0.25} ${h * 0.58} ${w * 0.5} ${h * 0.68} T${w} ${h * 0.66} V${h} H0 Z" fill="${hill}" stroke="#141414" stroke-width="5"/>${figs}</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

function outcome(kind: 'sheet' | 'page'): { note: string; step: number } {
  if (mockConfig.images === 'refused') throw new ApiError('IMAGE_SAFETY', 'The image service declined it every way we tried: with the reference images, without them, and from text only.');
  if (mockConfig.images === 'works') return { note: '', step: 1 };
  const r = Math.random();
  if (r < 0.65) return { note: '', step: 1 };
  if (r < 0.82) return { note: kind === 'sheet' ? FALLBACK_NOTES.sheetNoPhoto : FALLBACK_NOTES.pageNoPhoto, step: 2 };
  if (r < 0.93) return { note: FALLBACK_NOTES.textOnly, step: 3 };
  throw new ApiError(r < 0.97 ? 'IMAGE_SAFETY' : 'IMAGE_OTHER', 'The image service declined it every way we tried: with the reference images, without them, and from text only.');
}

const colorsOf = (st: Story) => st.characters.filter((c) => c.name.trim()).map((c) => c.color);

function mockOutline(st: Story): OutlineResult {
  const s = st.setup;
  const fmt = chooseFormat(s, st.characters);
  const hero = heroOf(st.characters);
  const H = hero?.name.trim() || 'Our hero';
  const others = st.characters.filter((c) => c !== hero && c.name.trim());
  const S = others[0]?.name.trim() || 'a new friend';
  const rival = st.characters.find((c) => c.role === 'pratinayak' && c.name.trim());
  const R = rival?.name.trim() || 'the trouble';
  const place = clean(s.desh.main) || 'a faraway land';
  const subs = s.desh.subs.map(clean).filter(Boolean);
  const sub = (i: number) => (subs.length ? subs[i % subs.length] : place);
  const when = kaalPhrase(s.kaal);
  const par = clean(s.paristhiti);
  const kat = clean(s.katha.split(/\.\s+/)[0]);
  const lesson = clean(s.lesson) || 'A calm mind and a kind heart always find the way';
  const pool = [
    `Once upon a time, ${when}, in ${lowerFirst(place)}, there lived ${H}.`,
    `${H} carried a wish, bright as a diya.`,
    par ? `But trouble was brewing: ${lowerFirst(par)}.` : 'But one day, everything changed.',
    kat ? `${H} had a choice to make. ${kat}.` : `${H} had a choice to make.`,
    `${R} came with a clever plan and a tempting offer.`,
    `"Pause. Breathe. See clearly, and then act," said ${S}.`,
    `${H} chose the harder, kinder path.`,
    `In the end, even ${R} understood.`,
    `Back at the ${sub(0)}, everyone gathered to celebrate.`,
    `${H} smiled. The old stories were right after all.`,
  ];
  const sw = styleWord(s.style);
  const prompt = (scene: string) => `${sw} children's book illustration. ${scene}. Setting: ${place}, ${when}. No text, letters or speech bubbles.`;
  const n = s.pageCount;
  const title = rival ? `${H} and ${R}` : `${H}'s Promise`;
  const pages: OutlinePage[] = [];
  for (let i = 0; i < n; i++) {
    const kind = kindAt(i, n);
    const isGrid = kind === 'middle' && fmt.layout === 'grid';
    const caption = kind === 'cover' ? title : kind === 'end' ? `And so the tale was told. Seekh: ${lesson}.` : pool[Math.round((i - 1) * (pool.length - 1) / Math.max(1, n - 3))];
    const location = kind === 'cover' ? place : sub(i);
    const panels = isGrid ? blankPanels(st, location).map((pn, k) => ({
      ...pn,
      bubble: ['', `What should we do, ${S}?`, `Trust your heart, ${H}.`, 'Together, then!', '', 'I will keep my word.'][k],
      speakerId: [1, 3, 5].includes(k) ? hero?.id || '' : k === 2 ? others[0]?.id || '' : '',
    })) : [];
    pages.push({ kind, caption, imagePrompt: prompt(kind === 'cover' ? `Cover: ${H} front and centre with the whole cast in ${place}` : `${H} at the ${location}`), layout: kind === 'middle' ? fmt.layout : 'caption', location, bubble: '', panels });
  }
  return { title, formatReason: fmt.reason, pages };
}

function mockSimple(st: Story): OutlineResult {
  const s = st.simple!;
  const H = s.hero.trim() || 'Our hero';
  const lines = [
    `${H} woke up with a big smile.`,
    `Something exciting was about to happen!`,
    `${H} put on a bright red cape.`,
    `"I can help!" said ${H}.`,
    `${H} gave the biggest, warmest hug.`,
    `Everyone laughed and sang together.`,
    `${H} was brave, kind and strong.`,
    `It was the best day ever.`,
    `${H} looked at the stars and smiled.`,
    `Tomorrow would be another adventure.`,
  ];
  const n = s.pages;
  return {
    title: `${H} Saves the Day`,
    formatReason: '',
    characterNotes: `${H}, age ${s.age}, with a red cape.`,
    pages: Array.from({ length: n }, (_, i) => ({
      kind: kindAt(i, n),
      caption: i === 0 ? `${H} Saves the Day` : i === n - 1 ? `And ${H} went to sleep, happy and proud.` : lines[(i - 1) % lines.length],
      imagePrompt: `Children's comic illustration of ${H}. ${i === 0 ? 'Cover scene' : `Scene ${i + 1}`}. No text, letters or speech bubbles.`,
      layout: 'caption' as const, location: '', bubble: '', panels: [],
    })),
  };
}

export const mockApi: StoryApi = {
  mode: 'mock',
  async writeOutline(st, signal) {
    await wait(9000, signal);
    if (mockConfig.storyFails) throw new ApiError('GENERATION_INVALID', 'The story writer took too long to answer.', true);
    return isSimple(st) ? mockSimple(st) : mockOutline(st);
  },
  async rewritePage(st, pageId, signal): Promise<RewriteResult> {
    await wait(2600, signal);
    const p = st.pages.find((x) => x.id === pageId)!;
    const hero = heroOf(st.characters)?.name || 'Our hero';
    const alts = [`Suddenly, ${hero} heard a tiny sound from the trees.`, `${hero} closed both eyes, took one deep breath, and stepped forward.`, 'The wind changed, and with it, everything else.'];
    return {
      caption: p.kind === 'cover' ? p.caption : alts[Math.floor(Math.random() * alts.length)],
      imagePrompt: p.imagePrompt.replace(/^([^.]*\.)\s*/, '$1 Dramatic low camera angle. '),
      bubble: p.bubble,
      panels: p.panels.map((pn) => ({ ...pn })),
    };
  },
  async drawSheet(_st, c: Character, signal): Promise<ImageResult> {
    await wait(3500 + Math.random() * 1500, signal);
    const o = outcome('sheet');
    return { blob: mockArt(`sheet-${c.id}-${uid('v')}`, [c.color, c.color, c.color]), ...o };
  },
  async drawPage(st, pageId, signal): Promise<PageImageResult> {
    await wait(3000 + Math.random() * 3000, signal);
    const p = st.pages.find((x) => x.id === pageId)!;
    const o = outcome('page');
    if (p.kind === 'middle' && p.layout === 'grid') {
      const panels = p.panels.slice(0, 6).map((pn) => ({ blob: mockArt(`${pn.id}-${uid('v')}`, colorsOf(st).slice(0, 2), 400, 320), ...o }));
      return { image: null, panels, ...o };
    }
    return { image: { blob: mockArt(`${p.id}-${uid('v')}`, colorsOf(st), 400, 500), ...o }, panels: [], ...o };
  },
};
