// Prompts and JSON schemas for Claude (story text) and Gemini (pictures).
// Content rules follow backend-spec §4.3: age-appropriate, Kaam framed as wishes and love,
// inspired by (not copying) traditional tales, the seekh stated on the end page, no text in images.

import { PURUSHARTHAS, ROLE_LABELS } from '../domain/constants';
import { chooseFormat, clean, drivesOf, kaalPhrase, styleWord } from '../domain/model';
import type { Character, Page, Story } from '../domain/types';

export const STORY_SYSTEM = `You write picture-book comics for children in the storytelling tradition of the Panchatantra, Jataka tales, Hitopadesha and the Itihasa. A parent has set up the desh (place), kaal (time), paatra (characters and what drives them), paristhiti (circumstances) and katha (plot and life lesson, the seekh). Turn that into a page-by-page comic.

Rules you always follow:
- Write for the stated reading age: short, concrete sentences; warm, clear language; no violence beyond fable-level peril; nothing frightening, cruel or romantic.
- The four purusharthas guide each key character. Dharma is duty and doing right; Artha is using resources wisely and sharing; Kaam is ALWAYS child-friendly: wishes, ambition, and love for family and friends, never romance; Moksh is inner calm and letting go.
- Be respectful of Hindu traditions, deities and festivals. Be inspired by the traditional tales; never copy copyrighted modern retellings.
- Every character the parent named appears by name. Keep each character's look consistent with their description.
- The last page states the seekh plainly in its caption, starting with "Seekh:".
- Image prompts describe one clear scene for an illustrator: who is there (by name), where, what they are doing, their expressions, the light. Never ask for words, letters, signs, captions or speech bubbles in a picture: all text is added separately. End every image prompt with "No text, letters or speech bubbles."
- Speech bubbles are short (at most 12 words) and spoken by a named character or left empty.`;

function charLine(c: Character): string {
  const drives = drivesOf(c)
    .map((k) => `${k}${c.purushartha[k].note.trim() ? ` (${clean(c.purushartha[k].note)})` : ''}`)
    .join('; ');
  return [
    `- ${c.name.trim()}: ${ROLE_LABELS[c.role]}${c.isKey ? ', key character' : ''}; ${c.form === 'Human' ? (c.gender === 'female' ? 'girl/woman' : 'boy/man') : `${c.gender} ${c.form.toLowerCase()}`}`
      + `${c.age ? `, age ${c.age}` : ''}. Looks: ${clean(c.appearance) || 'not described'}.`,
    drives ? `  Driven by: ${drives}.` : '',
  ].filter(Boolean).join('\n');
}

export function outlinePrompt(st: Story): { text: string; layout: Page['layout']; reason: string } {
  const s = st.setup;
  const fmt = chooseFormat(s, st.characters);
  const n = s.pageCount;
  const named = st.characters.filter((c) => c.name.trim());
  const subs = s.desh.subs.filter((x) => x.trim());
  const middle = n - 2;
  const layoutRule = fmt.layout === 'grid'
    ? `Every middle page is a 3×2 comic grid: its "caption" is one or two lines of narration for the top of the page, its "imagePrompt" summarises the page, and it has EXACTLY 6 panels in reading order (establishing shot, close-up, reply, two characters together, a detail, a decision or turn). Each panel has its own "prompt" (one scene, ending "No text, letters or speech bubbles."), a "bubble" (or "" for none) and a "speaker" (a character name from the list, or "" when there is no bubble). Give at least 3 of the 6 panels a bubble.`
    : 'Every middle page is a single scene: "caption" is 1–3 short sentences under the picture, "bubble" is an optional short line of speech ("" if none), and "panels" is [].';
  const text = `Write a comic of exactly ${n} pages: page 1 is the cover, pages 2–${n - 1} are the ${middle} story pages, and page ${n} is the ending.

THE KATHA
Desh (main place): ${clean(s.desh.main)}
Sublocations (set each page in one of these, or the main place): ${subs.length ? subs.join('; ') : 'none, use the main place'}
Kaal: ${kaalPhrase(s.kaal)}
Paristhiti (the situation before the story): ${clean(s.paristhiti) || 'not given; invent a gentle problem that fits the plot'}
What is at stake: ${clean(s.stakes) || 'not given'}
Main plot: ${clean(s.katha)}
Seekh (life lesson): ${clean(s.lesson) || 'choose a fitting one from the plot'}
Inspired by: ${s.inspiration.join(', ') || 'original tale'}
Darshan lens: ${s.darshan && s.darshan !== 'None' ? s.darshan : 'none'}
Tone: ${s.tone}
Reading age: ${s.age}
Art style: ${styleWord(s.style)}

PAATRA
${named.map(charLine).join('\n')}

PAGES
- Cover: "caption" is the book title (short and catchy), "imagePrompt" shows the nayak front and centre with the main cast, "bubble" is "", "panels" is [].
- ${layoutRule}
- Ending: "caption" is a warm closing line followed by the seekh ("… Seekh: …"), "bubble" is "", "panels" is [].
- "location" is the sublocation (or main place) where the page happens.
- "title" repeats the cover title.

Purushartha guide: ${PURUSHARTHAS.map((p) => `${p.k} = ${p.hint}`).join('; ')}.`;
  return { text, layout: fmt.layout, reason: fmt.reason };
}

const PANEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prompt', 'bubble', 'speaker'],
  properties: {
    prompt: { type: 'string' },
    bubble: { type: 'string' },
    speaker: { type: 'string' },
  },
};

const PAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['caption', 'imagePrompt', 'location', 'bubble', 'panels'],
  properties: {
    caption: { type: 'string' },
    imagePrompt: { type: 'string' },
    location: { type: 'string' },
    bubble: { type: 'string' },
    panels: { type: 'array', items: PANEL_SCHEMA },
  },
};

export const OUTLINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'pages'],
  properties: {
    title: { type: 'string' },
    pages: { type: 'array', items: PAGE_SCHEMA },
  },
};

export const REWRITE_SCHEMA = PAGE_SCHEMA;

export function rewritePrompt(st: Story, pageId: string): string {
  const i = st.pages.findIndex((p) => p.id === pageId);
  const p = st.pages[i];
  const around = st.pages.map((x, k) => `${k + 1}. ${x.caption}`).join('\n');
  const isGrid = p.kind === 'middle' && p.layout === 'grid';
  return `Here is the current comic, page by page:
${around}

Rewrite page ${i + 1} (${p.kind === 'cover' ? 'the cover' : p.kind === 'end' ? 'the ending' : 'a story page'}) so it reads better and moves the story forward, keeping it consistent with the pages around it and the katha below.
Current caption: ${p.caption}
Current image prompt: ${p.imagePrompt}
${isGrid ? `It is a 3×2 grid page: return EXACTLY 6 panels (prompt, bubble, speaker). Current panels:\n${p.panels.map((x, k) => `${k + 1}. ${x.prompt} | bubble: ${x.bubble || '-'}`).join('\n')}` : 'It is a single scene: return "panels" as [].'}
${p.kind === 'cover' ? 'Keep the caption exactly as the current title.' : ''}${p.kind === 'end' ? 'Keep the seekh in the caption, starting "Seekh:".' : ''}

${outlinePrompt(st).text.split('PAGES')[0]}`;
}

// ---------------- Gemini ----------------

const STYLE_LINES: Record<string, string> = {
  Comic: "Children's comic book illustration, bold black ink outlines, bright flat colours, soft halftone shading, warm and joyful, rounded friendly characters.",
  Watercolour: "Soft watercolour children's book illustration, gentle washes of colour, warm light, rounded friendly characters.",
  Crayon: "Hand-drawn crayon children's book illustration, textured strokes, bright cheerful colours, rounded friendly characters.",
  'Madhubani-inspired': "Madhubani-inspired folk-art children's illustration, bold double outlines, flat colour fills with traditional patterns, rounded friendly characters.",
};
export const NO_TEXT = 'Absolutely no text, letters, numbers, signs or speech bubbles anywhere in the image.';

export function styleLine(style: string): string {
  return STYLE_LINES[style] || STYLE_LINES.Comic;
}

export function describe(c: Character): string {
  const who = c.form === 'Human' ? (c.gender === 'female' ? 'a girl or woman' : 'a boy or man')
    : c.form === 'Divine being' ? `a gentle divine being (${c.gender})` : `a ${c.gender} ${c.form.toLowerCase()}`;
  return `${c.name.trim() || 'Unnamed'}: ${who}${c.age ? `, age ${c.age}` : ''}. ${clean(c.appearance)}`.trim();
}

/** Characters shown on a page: named in its text, a panel speaker, or the nayak (at most 4). */
export function charactersOnPage(st: Story, p: Page): Character[] {
  const text = [p.caption, p.imagePrompt, p.bubble, ...p.panels.map((x) => `${x.prompt} ${x.bubble}`)].join(' ').toLowerCase();
  const speakers = new Set(p.panels.map((x) => x.speakerId).filter(Boolean));
  const named = st.characters.filter((c) => c.name.trim());
  const on = named.filter((c) => speakers.has(c.id) || text.includes(c.name.trim().toLowerCase()));
  const hero = named.find((c) => c.role === 'nayak');
  if (hero && !on.includes(hero) && (p.kind !== 'middle' || on.length === 0)) on.unshift(hero);
  return (p.kind === 'cover' ? named : on).slice(0, 4);
}

export function sheetPrompt(st: Story, c: Character, withPhoto: boolean): string {
  return [
    styleLine(st.setup.style),
    `A character sheet for a children's picture book: the same character drawn three times side by side on a plain cream background (front view, side view, and a lively action pose), full body, consistent colours and outfit in all three.`,
    `Character: ${describe(c)}`,
    `Setting for costume and style: ${clean(st.setup.desh.main) || 'ancient India'}, ${kaalPhrase(st.setup.kaal)}.`,
    withPhoto ? 'Use the attached reference photo only as a loose guide for hair, skin tone and clothing. Draw a cartoon character, not a realistic likeness.' : '',
    NO_TEXT,
  ].filter(Boolean).join('\n');
}

export interface ImageRefs {
  sheets: { name: string; blobId: string }[];
  photos: string[];
  places: string[];
}

export function scenePrompt(st: Story, p: Page, scene: string, cast: Character[], refs: { sheets: string[]; photos: boolean; places: boolean }): string {
  const s = st.setup;
  return [
    styleLine(s.style),
    `Setting: ${clean(p.location) || clean(s.desh.main)}, ${kaalPhrase(s.kaal)}. Mood: ${s.tone.toLowerCase()}.`,
    cast.length ? `Characters in this picture:\n${cast.map((c) => `- ${describe(c)}`).join('\n')}` : '',
    refs.sheets.length ? `Match the attached character sheets exactly for ${refs.sheets.join(', ')} (one sheet per character, in that order).` : '',
    refs.photos ? 'Reference photos are attached too: use them only as a loose guide for hair, skin tone and clothing, drawn as cartoons.' : '',
    refs.places ? 'Place reference images are attached: borrow their landscape and architecture.' : '',
    `Scene: ${scene}`,
    NO_TEXT,
  ].filter(Boolean).join('\n');
}

// ---------------- Simple mode (works like v1) ----------------

export const SIMPLE_SYSTEM = `You write short comic storybooks for young children, starring a real child and their family.
Rules you always follow:
- Write for the child's age: 1–3 short, simple sentences per page, warm and concrete, using the names.
- Nothing frightening, cruel or violent; gentle, kind and joyful.
- Image prompts describe one vivid scene for an illustrator (who, where, action, expression, lighting) and never ask for words, letters, signs or speech bubbles. End every image prompt with "No text, letters or speech bubbles."`;

export const SIMPLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'characters', 'pages'],
  properties: {
    title: { type: 'string' },
    characters: { type: 'string' },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['caption', 'imagePrompt'],
        properties: { caption: { type: 'string' }, imagePrompt: { type: 'string' } },
      },
    },
  },
};

export function simplePrompt(st: Story): string {
  const s = st.simple!;
  const n = s.pages;
  const who = s.gender === 'child' ? 'child' : s.gender;
  return `Write a ${n}-page comic storybook for a ${s.age}-year-old.
Hero: ${s.hero}, a ${s.age}-year-old ${who}. Other characters: ${s.others || 'none'}.
Story idea: ${s.idea}
Tone: ${s.tone}.
Page 1 is the cover (caption = a short tagline). Page ${n} is the final page (a warm closing line; "The End" is added by the layout, don't write it).
Captions: 1–3 short, simple sentences a ${s.age}-year-old can follow. Use the names.
imagePrompt: a vivid scene description for an illustrator (who, where, action, expression, lighting). No text in the image.
"title": the cover title. "characters": one consistent visual description of every character (age, hair, clothes, including any hero costume).
Return exactly ${n} pages.`;
}

export function simpleScenePrompt(st: Story, scene: string, refs: { photo: boolean; cover: boolean }): string {
  return [
    styleLine('Comic'),
    st.simple?.characters ? `Characters: ${st.simple.characters}` : '',
    refs.photo ? "Use the attached family photo only as a loose reference for hair, skin tone and clothing, redrawn as simple cartoon characters rather than a realistic likeness." : '',
    refs.cover ? 'Match the character designs in the attached cover illustration.' : '',
    `Scene: ${scene}`,
    NO_TEXT,
  ].filter(Boolean).join('\n');
}

export function simpleRewritePrompt(st: Story, pageId: string): string {
  const i = st.pages.findIndex((p) => p.id === pageId);
  const p = st.pages[i];
  return `${simplePrompt(st)}

Here is the comic so far, page by page:
${st.pages.map((x, k) => `${k + 1}. ${x.caption}`).join('\n')}

Rewrite page ${i + 1} only, keeping it consistent with the pages around it. Current caption: ${p.caption}. Current image prompt: ${p.imagePrompt}.
Return "caption" and "imagePrompt"; set "location" and "bubble" to "" and "panels" to [].`;
}
