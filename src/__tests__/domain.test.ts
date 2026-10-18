import { describe, expect, it } from 'vitest';
import { chooseFormat, kaalPhrase, missingForWriting, newCharacter, newPage, newStory, pageText } from '../domain/model';

describe('chooseFormat (backend-spec §4.2)', () => {
  it('honours explicit choices', () => {
    const st = newStory();
    expect(chooseFormat({ ...st.setup, format: 'single' }, st.characters).layout).toBe('caption');
    expect(chooseFormat({ ...st.setup, format: 'grid' }, st.characters).layout).toBe('grid');
  });
  it('auto picks grid at score >= 5', () => {
    const st = newStory();
    const chars = [newCharacter('nayak', 0, { name: 'A' }), newCharacter('pratinayak', 1, { name: 'B' })];
    const simple = { ...st.setup, desh: { main: 'x', subs: ['a'] }, katha: 'short' };
    expect(chooseFormat(simple, chars).layout).toBe('caption');
    // 2 keys + 2 subs + plot > 200 (1) = 5
    const rich = { ...st.setup, desh: { main: 'x', subs: ['a', 'b'] }, katha: 'y'.repeat(250) };
    expect(chooseFormat(rich, chars).layout).toBe('grid');
  });
});

describe('missingForWriting', () => {
  it('lists desh, named nayak and plot', () => {
    const st = newStory();
    expect(missingForWriting(st)).toHaveLength(3);
    st.setup.desh.main = 'Kashi';
    st.characters[0].name = 'Chiku';
    st.setup.katha = 'A plot.';
    expect(missingForWriting(st)).toEqual([]);
  });
});

describe('kaalPhrase', () => {
  it('uses custom text, era and ritu', () => {
    expect(kaalPhrase({ era: 'Long, long ago', custom: '', ritu: '' })).toBe('long, long ago');
    expect(kaalPhrase({ era: 'Treta Yuga', custom: '', ritu: 'Varsha · monsoon' })).toBe('in the Treta Yuga, in Varsha');
    expect(kaalPhrase({ era: 'Treta Yuga', custom: 'When kings rode elephants.', ritu: '' })).toBe('when kings rode elephants');
  });
});

describe('pageText (read aloud)', () => {
  it('reads narration then "Name says: bubble" for grids', () => {
    const st = newStory();
    st.characters[0].name = 'Chiku';
    st.pages = [newPage('cover'), newPage('middle', { layout: 'grid', caption: 'Rain fell.', panels: [{ id: 'p1', prompt: '', bubble: 'Look!', speakerId: st.characters[0].id }, { id: 'p2', prompt: '', bubble: 'Hmm.', speakerId: '' }] }), newPage('end', { caption: 'Bye.' })];
    expect(pageText(st, 1)).toBe('Rain fell. Chiku says: Look! Hmm.');
    expect(pageText(st, 2)).toBe('Bye. The End.');
  });
});
