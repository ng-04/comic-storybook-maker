import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/claude', () => ({ claudeJson: vi.fn() }));

import { claudeJson } from '../api/claude';
import { directApi } from '../api/direct';
import { NO_TEXT, scenePrompt, STORY_SYSTEM } from '../api/prompts';
import { newCharacter, newPage, newStory } from '../domain/model';

const page = (panels = 0) => ({ caption: 'c', imagePrompt: 'p', location: 'l', bubble: '', panels: Array.from({ length: panels }, () => ({ prompt: 'x', bubble: 'hi', speaker: 'Chiku' })) });

function story(format: 'single' | 'grid') {
  const st = newStory();
  st.characters = [newCharacter('nayak', 0, { name: 'Chiku' })];
  st.setup = { ...st.setup, pageCount: 6, format, desh: { main: 'Kashi', subs: [] }, katha: 'A plot.' };
  return st;
}

describe('directApi.writeOutline', () => {
  it('retries once when the page count is wrong, then maps pages', async () => {
    const m = vi.mocked(claudeJson);
    m.mockReset();
    m.mockResolvedValueOnce({ title: 'T', pages: [page(), page()] })
      .mockResolvedValueOnce({ title: 'T', pages: Array.from({ length: 6 }, () => page()) });
    const res = await directApi.writeOutline(story('single'));
    expect(m).toHaveBeenCalledTimes(2);
    expect(res.pages.map((p) => p.kind)).toEqual(['cover', 'middle', 'middle', 'middle', 'middle', 'end']);
    expect(res.pages[0].caption).toBe('T');
  });

  it('maps grid speakers to character ids', async () => {
    const m = vi.mocked(claudeJson);
    m.mockReset();
    m.mockResolvedValueOnce({ title: 'T', pages: [page(), page(6), page(6), page(6), page(6), page()] });
    const st = story('grid');
    const res = await directApi.writeOutline(st);
    expect(res.pages[1].layout).toBe('grid');
    expect(res.pages[1].panels).toHaveLength(6);
    expect(res.pages[1].panels[0].speakerId).toBe(st.characters[0].id);
  });

  it('fails with GENERATION_INVALID after two bad answers', async () => {
    const m = vi.mocked(claudeJson);
    m.mockReset();
    m.mockResolvedValue({ title: 'T', pages: [page()] });
    await expect(directApi.writeOutline(story('single'))).rejects.toMatchObject({ code: 'GENERATION_INVALID' });
  });
});

describe('prompts', () => {
  it('keep the child-safety and no-text rules', () => {
    expect(STORY_SYSTEM).toMatch(/Kaam is ALWAYS child-friendly/);
    expect(STORY_SYSTEM).toMatch(/No text, letters or speech bubbles/);
    const st = story('single');
    st.pages = [newPage('cover')];
    expect(scenePrompt(st, st.pages[0], 'A scene', st.characters, { sheets: [], photos: false, places: false })).toContain(NO_TEXT);
  });
});
