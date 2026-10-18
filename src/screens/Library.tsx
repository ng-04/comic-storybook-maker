import { useNavigate } from 'react-router-dom';
import { IconPlus } from '../components/Icons';
import { PagePanel } from '../components/PagePanel';
import { ago, clean, newPage } from '../domain/model';
import type { Story } from '../domain/types';
import { askConfirm, createSequel, createStory, deleteStory, loadLibrary, useStore } from '../state/store';

export function openPath(st: Story): string {
  const screen = st.status === 'done' ? 'read' : st.status === 'illustrating' ? 'pictures' : st.status === 'outline' ? 'outline' : 'desh';
  return `/s/${st.id}/${screen}`;
}

function statusLabel(b: Story) {
  const drawn = b.pages.filter((p) => p.versions.length).length;
  return b.status === 'done' ? 'Ready to read' : b.status === 'illustrating' ? `Drawing ${drawn}/${b.pages.length}` : b.status === 'outline' ? 'Outline to review' : 'Draft';
}

export function Library() {
  const { loaded, loadError, stories } = useStore();
  const nav = useNavigate();
  const startNew = () => nav(`/s/${createStory().id}/desh`);
  const askDelete = (st: Story) => askConfirm({
    title: 'Delete this storybook?',
    body: `“${st.title}” and all its pictures will be removed from this browser. This can't be undone.`,
    yes: 'Delete',
    run: () => void deleteStory(st.id),
  });

  return (
    <main className="wrap">
      <div className="row gap-16 between" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 'clamp(44px, 7vw, 68px)' }}>My storybooks</h1>
        <button className="btn btn-primary" onClick={startNew}>New katha</button>
      </div>

      {!loaded && (
        <div role="status" aria-label="Loading your storybooks" className="cards">
          {[0, 1, 2, 3].map((k) => <div key={k} className="stack gap-10"><div className="skel pulse" /><div className="pulse" style={{ height: 18, width: '70%', background: '#D9D1C1', borderRadius: 6 }} /></div>)}
        </div>
      )}

      {loaded && loadError && (
        <div className="panel stack gap-12" role="alert" style={{ padding: 28, alignItems: 'flex-start', maxWidth: 560 }}>
          <h2 className="h2">We couldn't load your storybooks</h2>
          <p className="m0">This browser blocked its storage ({loadError}). Private windows and some privacy settings do this.</p>
          <button className="btn btn-primary" onClick={() => void loadLibrary()}>Try again</button>
        </div>
      )}

      {loaded && !loadError && stories.length === 0 && (
        <div className="panel stack gap-14" style={{ padding: '40px 28px', alignItems: 'flex-start', backgroundColor: '#1F4FB8', color: '#FFFFFF', backgroundImage: 'radial-gradient(rgba(20,20,20,.3) 1.2px, transparent 1.8px)', backgroundSize: '14px 14px' }}>
          <h2 className="display" style={{ fontSize: 52 }}>Your shelf is empty</h2>
          <p style={{ margin: 0, fontSize: 19, maxWidth: '46ch' }}>Every katha starts with a place. Pick a desh, add your paatra, and the rest follows.</p>
          <button className="btn btn-primary btn-lg" onClick={startNew}>Start your first katha</button>
        </div>
      )}

      {loaded && !loadError && stories.length > 0 && (
        <ul className="cards">
          <li>
            <button className="tile" style={{ height: '100%' }} onClick={startNew} aria-label="New katha">
              <div className="lift" style={{ aspectRatio: '210 / 297', border: '5px dashed #141414', borderRadius: 4, background: '#FFFDF8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ width: 64, height: 64, border: '4px solid #141414', borderRadius: '50%', background: '#FFD93B', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '3px 3px 0 #141414' }}><IconPlus size={30} /></span>
                <span className="h2">New katha</span>
              </div>
            </button>
          </li>
          {stories.map((b) => {
            const cover = b.pages[0] || newPage('cover', { caption: b.title });
            const badge = b.status === 'done' ? 'b-done' : b.status === 'illustrating' ? 'b-drawing' : 'b-queued';
            return (
              <li key={b.id} className="stack gap-10">
                <button className="tile" onClick={() => nav(openPath(b))} aria-label={`Open ${b.title}`}>
                  <div className="lift" style={{ boxShadow: '6px 6px 0 #141414' }}>
                    <PagePanel story={b} page={cover.kind === 'cover' ? cover : newPage('cover', { caption: b.title })} />
                  </div>
                </button>
                <div className="stack gap-6">
                  <p style={{ margin: 0, fontWeight: 700, lineHeight: 1.25 }}>{b.title}</p>
                  <p className="muted" style={{ margin: 0, fontSize: 14 }}>{[b.setup.inspiration[0], clean(b.setup.desh.main)].filter(Boolean).join(' · ')}</p>
                  <div className="row gap-6">
                    <span className={`badge ${badge}`}>{statusLabel(b)}</span>
                    <span className="muted" style={{ fontSize: 14 }}>{ago(b.updatedAt)}</span>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="linkbtn" style={{ fontSize: 15 }} onClick={() => { const s = createSequel(b.id); if (s) nav(`/s/${s.id}/paristhiti`); }}>Make a sequel</button>
                    <span aria-hidden="true">·</span>
                    <button className="linkbtn" style={{ fontSize: 15, color: '#B3261E' }} onClick={() => askDelete(b)}>Delete</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
