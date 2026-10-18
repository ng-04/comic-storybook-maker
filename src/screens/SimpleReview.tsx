// Simple mode, step 2: check the written story before any picture is drawn ("review before spend").
// Nothing here calls an AI service; "Looks good, draw it" is the only way to start drawing.

import { useNavigate } from 'react-router-dom';
import { pageLabel } from '../domain/model';
import type { Story } from '../domain/types';
import { startIllustrating, updatePage, updateStory } from '../state/store';

export function SimpleReview({ st }: { st: Story }) {
  const nav = useNavigate();
  if (!st.pages.length) {
    return (
      <div className="panel stack gap-12" style={{ padding: 28, alignItems: 'flex-start', maxWidth: 560 }}>
        <h1 className="h1">No story yet</h1>
        <p className="m0">Fill in the form and press "Make my comic!".</p>
        <button className="btn btn-primary" onClick={() => nav(`/s/${st.id}/simple`)}>Go to the form</button>
      </div>
    );
  }
  const drawn = st.status === 'illustrating' || st.status === 'done' || st.pages.some((p) => p.versions.length);
  const draw = () => { startIllustrating(st.id); nav(`/s/${st.id}/pictures`); };
  const setTitle = (v: string) => updateStory(st.id, (x) => ({ ...x, title: v, pages: x.pages.map((p, k) => (k === 0 ? { ...p, caption: v } : p)) }));

  return (
    <div className="stack gap-20" style={{ maxWidth: 820 }}>
      <div>
        <p className="kicker">Check your story</p>
        <h1 className="h1">Does this look right?</h1>
        <p className="muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>
          No pictures have been drawn yet. Read it through and fix any name or line you'd like changed. Pictures are only drawn after you press "Looks good, draw it".
        </p>
      </div>
      <div>
        <label className="label" htmlFor="sr-title">Book title</label>
        <input className="input" id="sr-title" style={{ fontFamily: "'Bangers', Impact, sans-serif", fontSize: 26, letterSpacing: '.03em' }} value={st.title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <ol className="stack gap-14" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {st.pages.map((p, i) => (
          <li key={p.id} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="strip" style={{ padding: '6px 14px', background: p.kind === 'cover' ? '#1F4FB8' : p.kind === 'end' ? '#FF4A3D' : '#FFD93B' }}>
              <h2 className="h2" style={{ fontSize: 22, color: p.kind === 'cover' ? '#FFFFFF' : '#141414' }}>{pageLabel(p, i)}</h2>
            </div>
            <div className="stack gap-12" style={{ padding: 14 }}>
              {p.kind !== 'cover' && (
                <div>
                  <label className="label" htmlFor={`sr-cap-${p.id}`}>{p.kind === 'end' ? 'Closing words' : 'Words on this page'}</label>
                  <textarea className="input" id={`sr-cap-${p.id}`} rows={2} value={p.caption} onChange={(e) => updatePage(st.id, p.id, { caption: e.target.value })} />
                </div>
              )}
              <details>
                <summary>Picture description</summary>
                <textarea className="input mono" style={{ marginTop: 8 }} rows={3} aria-label={`Picture description for ${pageLabel(p, i)}`} value={p.imagePrompt}
                  onChange={(e) => updatePage(st.id, p.id, { imagePrompt: e.target.value })} />
              </details>
            </div>
          </li>
        ))}
      </ol>
      <div className="panel row gap-14 between" style={{ padding: 18, background: '#FFFDF8' }}>
        <p className="m0" style={{ flex: '1 1 280px', fontWeight: 700 }}>
          {drawn ? 'Pictures have already been drawn. Changes here apply when you redraw a page.' : `This will draw ${st.pages.length} pictures, starting with the cover.`}
        </p>
        <div className="row gap-10">
          <button className="btn" onClick={() => nav(`/s/${st.id}/simple`)}>Change the story idea</button>
          {drawn
            ? <button className="btn btn-primary btn-lg" onClick={() => nav(`/s/${st.id}/pictures`)}>See the pictures</button>
            : <button className="btn btn-primary btn-lg" onClick={draw}>Looks good, draw it</button>}
        </div>
      </div>
    </div>
  );
}
