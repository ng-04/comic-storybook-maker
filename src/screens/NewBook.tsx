// Start of every new book: choose Simple (one form, like the first version) or Advanced (the five-step katha).

import { useNavigate } from 'react-router-dom';
import { createStory } from '../state/store';

export function NewBook() {
  const nav = useNavigate();
  const start = (mode: 'simple' | 'advanced') => {
    const st = createStory(mode);
    nav(`/s/${st.id}/${mode === 'simple' ? 'simple' : 'desh'}`, { replace: true });
  };
  const cards = [
    {
      mode: 'simple' as const, title: 'Simple', time: 'About 2 minutes to set up',
      points: ["Your child's name, age and the people in the story", 'One story idea, a tone and a page count', 'Optional family photo', 'Claude writes it and every page is drawn straight away'],
      cta: 'Make a simple comic', cls: 'btn-primary', bg: '#FFD93B',
    },
    {
      mode: 'advanced' as const, title: 'Advanced', time: 'Five steps, full control',
      points: ['Desh, kaal, paatra, paristhiti and katha', 'Purusharthas, a seekh and a darshan lens', 'Approve cartoon character sheets first', 'Review and edit every page, single scenes or 3×2 comic grids'],
      cta: 'Build a katha', cls: 'btn-blue', bg: '#E6EEFF',
    },
  ];
  return (
    <div className="stack gap-24">
      <div>
        <p className="kicker">New storybook</p>
        <h1 className="h1">How do you want to make it?</h1>
        <p className="muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>Both make a printable comic you can read aloud and save as a PDF. You can make the next book the other way.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 24 }}>
        {cards.map((c) => (
          <section key={c.mode} className="panel stack gap-14" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="strip" style={{ background: c.bg }}>
              <h2 className="h2" style={{ fontSize: 34 }}>{c.title}</h2>
              <span className="badge">{c.time}</span>
            </div>
            <ul className="stack gap-8" style={{ margin: 0, padding: '4px 20px 0 40px' }}>
              {c.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <div style={{ padding: '6px 20px 20px' }}>
              <button className={`btn btn-lg ${c.cls}`} onClick={() => start(c.mode)}>{c.cta}</button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
