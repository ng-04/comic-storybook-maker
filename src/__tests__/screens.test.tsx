// Every route renders in demo mode without crashing, and shows its heading.
import { act, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import App from '../App';
import { mockConfig } from '../api/mock';
import { updateSettings } from '../state/settings';
import { createStory, storyById, updateStory, writeOutline } from '../state/store';

describe('screens', () => {
  let id = '';
  beforeAll(async () => {
    updateSettings({ demo: true });
    mockConfig.speed = 0.001;
    const st = createStory();
    id = st.id;
    updateStory(id, (x) => ({ ...x, setup: { ...x.setup, desh: { main: 'Kashi', subs: [] }, katha: 'Plot.', pageCount: 6 }, characters: x.characters.map((c) => ({ ...c, name: 'Gauri' })) }));
    await writeOutline(id);
  });

  const cases: [string, RegExp][] = [
    ['#/', /Comic books with a lesson at heart/],
    ['#/settings', /Your API keys/],
    ['#/library', /My storybooks/],
    ['desh', /Where does the story happen/],
    ['kaal', /When does it happen/],
    ['paatra', /Who's in the story/],
    ['paristhiti', /What led to this moment/],
    ['katha', /The story and its lesson/],
    ['outline', /Review the katha/],
    ['pictures', /Drawing your pictures|Every picture is drawn/],
    ['read', /Page 1 of 6/],
  ];
  for (const [route, heading] of cases) {
    it(`renders ${route}`, async () => {
      window.location.hash = route.startsWith('#') ? route : `#/s/${id}/${route}`;
      const r = render(<App />);
      await act(async () => { await new Promise((res) => setTimeout(res, 30)); });
      expect(screen.getAllByText(heading).length).toBeGreaterThan(0);
      r.unmount();
    });
  }

  it('renders the page editor', async () => {
    const pg = storyById(id)!.pages[1];
    window.location.hash = `#/s/${id}/pages/${pg.id}`;
    const r = render(<App />);
    await act(async () => { await new Promise((res) => setTimeout(res, 30)); });
    expect(screen.getByText(/Picture prompt/)).toBeTruthy();
    r.unmount();
  });
});
