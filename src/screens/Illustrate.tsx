// Illustrate (frontend-spec §3.11): cover first, then three pages at a time.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PagePanel } from '../components/PagePanel';
import { activeVersion, pageLabel } from '../domain/model';
import type { Page, Story } from '../domain/types';
import { pump, retryFailed, useStore } from '../state/store';

function statusOf(p: Page): { label: string; cls: string } {
  if (p.status === 'drawing') return { label: 'Drawing', cls: 'b-drawing' };
  if (p.status === 'queued') return { label: 'Queued', cls: 'b-queued' };
  if (p.status === 'failed') return { label: 'Failed', cls: 'b-failed' };
  if (p.versions.length) return { label: 'Done', cls: 'b-done' };
  return { label: 'Not drawn', cls: 'b-queued' };
}

export function Illustrate({ st }: { st: Story }) {
  const nav = useNavigate();
  const { online } = useStore();
  useEffect(() => { if (st.status === 'illustrating') pump(st.id); }, [st.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = st.pages.length;
  const nDone = st.pages.filter((p) => p.versions.length && p.status !== 'drawing' && p.status !== 'queued').length;
  const nDrawing = st.pages.filter((p) => p.status === 'drawing').length;
  const nQueued = st.pages.filter((p) => p.status === 'queued').length;
  const nFailed = st.pages.filter((p) => p.status === 'failed').length;
  const pct = n ? Math.round((nDone / n) * 100) : 0;
  const allDone = n > 0 && st.pages.every((p) => p.versions.length);
  return (
    <div className="stack gap-20">
      <div className="row gap-16 between" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 380px' }}>
          <h1 className="h1">{allDone && !nDrawing ? 'Every picture is drawn' : 'Drawing your pictures'}</h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>Cover first, then three pages at a time. Grid pages draw all six panels. Click any page to edit or redraw it. Keep this tab open while it draws.</p>
        </div>
        <div className="row gap-10">
          {nFailed > 0 && <button className="btn" onClick={() => retryFailed(st.id)} disabled={!online}>Retry failed pages</button>}
          {allDone && <button className="btn btn-primary" onClick={() => nav(`/s/${st.id}/read`)}>Read the book</button>}
        </div>
      </div>
      <div className="stack gap-8">
        <div className="row between" style={{ fontWeight: 700 }}><span>{nDone} of {n} pages drawn</span><span>{pct}%</span></div>
        <div className="progress" role="progressbar" aria-label="Pictures drawn" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
        <div className="row gap-8">
          <span className="badge b-done">{nDone} done</span>
          <span className="badge b-drawing">{nDrawing} drawing</span>
          <span className="badge b-queued">{nQueued} queued</span>
          <span className="badge b-failed">{nFailed} failed</span>
        </div>
      </div>
      <ul className="cards" style={{ gap: '30px 24px' }}>
        {st.pages.map((p, i) => {
          const s = statusOf(p);
          const v = activeVersion(p);
          const label = `${pageLabel(p, i)}${p.kind === 'middle' && p.layout === 'grid' ? ' · grid' : ''}`;
          const open = () => nav(`/s/${st.id}/pages/${p.id}`);
          return (
            <li key={p.id} className="stack gap-8">
              <button className="tile" onClick={open} aria-label={`Edit ${label}, ${s.label}`}>
                <div className="lift" style={{ boxShadow: '5px 5px 0 #141414' }}><PagePanel story={st} page={p} pageNo={i + 1} /></div>
              </button>
              <div className="row gap-6 between">
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span className={`badge ${s.cls}`}>{p.status === 'drawing' && <span className="dot pulse" aria-hidden="true" />}{s.label}</span>
              </div>
              {v?.note && p.status !== 'drawing' && <span className="badge b-note" style={{ alignSelf: 'flex-start' }} title={v.note}>Fallback used</span>}
              {p.status === 'failed' && <button className="btn btn-sm" onClick={open}>Edit prompt &amp; redraw</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
