// Writing the outline (frontend-spec §3.9): progress is driven by elapsed time, not server progress.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconCheck } from '../components/Icons';
import type { Story } from '../domain/types';
import { api } from '../api';
import { cancelWriting, toast, useStore, writeOutline } from '../state/store';

const STAGES = ['Reading the desh and kaal', 'Placing your paatra', 'Weaving in the paristhiti', 'Writing the katha, page by page', 'Laying out panels and bubbles', 'Checking the seekh and reading level'];
const THRESHOLDS = [0, 0.1, 0.25, 0.45, 0.7, 0.88];

export function Writing({ st }: { st: Story }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const job = useStore().writing[st.id];
  const [now, setNow] = useState(Date.now());
  const started = useRef(false);

  const start = () => {
    void writeOutline(st.id).then((ok) => {
      if (ok) { toast('Your katha is ready to review.'); nav(`/s/${st.id}/outline`, { replace: true }); }
    });
  };

  useEffect(() => {
    if (params.get('start') === '1' && !started.current) {
      started.current = true;
      setParams({}, { replace: true });
      if (!job || job.error) start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  if (!job) {
    return (
      <div className="panel stack gap-14" style={{ maxWidth: 720, margin: '24px auto 0', padding: 28, alignItems: 'flex-start' }}>
        <h1 className="h1">Nothing is being written right now</h1>
        <p className="m0">{st.pages.length ? 'Your outline is ready.' : 'Set up the katha, then press Write my katha.'}</p>
        <button className="btn btn-primary" onClick={() => nav(`/s/${st.id}/${st.pages.length ? 'outline' : 'katha'}`)}>{st.pages.length ? 'Review the outline' : 'Go to Katha'}</button>
      </div>
    );
  }

  if (job.error) {
    return (
      <div className="panel stack gap-14" role="alert" style={{ maxWidth: 720, margin: '24px auto 0', padding: 28, alignItems: 'flex-start' }}>
        <h1 className="h1">The katha didn't come together</h1>
        <p className="m0">{job.error} No pictures were drawn, and everything you set up is saved.</p>
        <div className="row gap-10">
          <button className="btn btn-primary" onClick={start}>Try again</button>
          <button className="btn" onClick={() => { cancelWriting(st.id); nav(`/s/${st.id}/katha`); }}>Change the katha</button>
        </div>
      </div>
    );
  }

  const expected = api().mode === 'mock' ? 9000 : 60000;
  const elapsed = Math.max(0, now - job.startedAt);
  const frac = Math.min(0.96, elapsed / expected);
  const secs = Math.floor(elapsed / 1000);
  return (
    <div style={{ maxWidth: 720, margin: '24px auto 0' }}>
      <div className="panel stack gap-20" style={{ padding: 28 }} role="status" aria-live="polite">
        <h1 className="display" style={{ fontSize: 54 }}>Writing your katha<span className="bounce" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></h1>
        <div className="progress" aria-hidden="true"><span style={{ width: `${Math.round(frac * 100)}%` }} /></div>
        <ol className="stack gap-10" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {STAGES.map((label, i) => {
            const done = frac >= (THRESHOLDS[i + 1] ?? 1.01);
            const active = !done && frac >= THRESHOLDS[i];
            return (
              <li key={label} className="row gap-12" style={{ fontWeight: 700, opacity: done || active ? 1 : 0.5, flexWrap: 'nowrap' }}>
                <span style={{ width: 30, height: 30, border: '3px solid #141414', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#FFD93B' : '#FFFFFF', flex: '0 0 auto' }}>
                  {done && <IconCheck size={16} />}{active && <span className="dot pulse" aria-hidden="true" />}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
        <p className="muted m0">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')} elapsed · usually 30 to 90 seconds. Keep this tab open; you can look at other steps meanwhile.</p>
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => { cancelWriting(st.id); nav(`/s/${st.id}/katha`); }}>Cancel</button>
      </div>
    </div>
  );
}
