// Outline review (frontend-spec §3.10). Nothing costs image credits until "Draw the pictures".

import { useNavigate } from 'react-router-dom';
import { IconDown, IconUp, Spinner } from '../components/Icons';
import { Chip } from '../components/Shell';
import { MAX_PAGES } from '../domain/constants';
import { clean, joinNames, pageLabel } from '../domain/model';
import type { Layout, Page, Panel, Story } from '../domain/types';
import { addPageAfter, deletePage, movePage, pendingSheets, rewritePage, setLayout, startIllustrating, updatePage, updateStory, useStore } from '../state/store';

export function PanelEditors({ st, p, onPromptKey, compact }: { st: Story; p: Page; onPromptKey?: (e: React.KeyboardEvent) => void; compact?: boolean }) {
  const named = st.characters.filter((c) => c.name.trim());
  const setPanel = (pn: Panel, patch: Partial<Panel>) => updatePage(st.id, p.id, (x) => ({ panels: x.panels.map((y) => (y.id === pn.id ? { ...y, ...patch } : y)) }));
  return (
    <ol style={{ listStyle: 'none', margin: compact ? '10px 0 0' : 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 12 }}>
      {p.panels.map((pn, k) => (
        <li key={pn.id} className="stack gap-8" style={{ border: '3px solid #141414', borderRadius: 8, padding: 10, background: '#FFFDF8' }}>
          <span style={{ fontFamily: "'Bangers', Impact, sans-serif", fontSize: 18, letterSpacing: '.04em' }}>Panel {k + 1}</span>
          <div>
            <label className="label" style={{ fontSize: 15 }} htmlFor={`pb-${pn.id}`}>Speech bubble</label>
            <input className="input" style={{ fontSize: 15, minHeight: 44 }} id={`pb-${pn.id}`} value={pn.bubble} placeholder="Leave empty for no bubble" onChange={(e) => setPanel(pn, { bubble: e.target.value })} />
          </div>
          <div className="row gap-6">
            <span style={{ fontSize: 14, fontWeight: 700 }}>Said by:</span>
            {[{ id: '', name: 'Narrator' }, ...named.map((c) => ({ id: c.id, name: c.name.trim() }))].map((o) => (
              <Chip key={o.id || 'narrator'} small style={{ minHeight: 36, fontSize: 13 }} pressed={(pn.speakerId || '') === o.id} onClick={() => setPanel(pn, { speakerId: o.id })}>{o.name}</Chip>
            ))}
          </div>
          <div>
            <label className="label" style={{ fontSize: 15 }} htmlFor={`pp-${pn.id}`}>Panel prompt</label>
            <textarea className="input mono" style={{ fontSize: 13 }} id={`pp-${pn.id}`} rows={2} value={pn.prompt} onKeyDown={onPromptKey} onChange={(e) => setPanel(pn, { prompt: e.target.value })} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function PageCard({ st, p, i, rewriting }: { st: Story; p: Page; i: number; rewriting: boolean }) {
  const isMid = p.kind === 'middle';
  const isGrid = isMid && p.layout === 'grid';
  const mids = st.pages.filter((x) => x.kind === 'middle').length;
  const label = pageLabel(p, i);
  const layouts: [Layout, string][] = [['caption', 'Single scene'], ['grid', '3×2 comic grid']];
  return (
    <li className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="strip" style={{ padding: '8px 14px', background: p.kind === 'cover' ? '#1F4FB8' : p.kind === 'end' ? '#FF4A3D' : '#FFD93B' }}>
        <div className="row gap-8">
          <h2 className="h2" style={{ fontSize: 22, color: p.kind === 'cover' ? '#FFFFFF' : '#141414' }}>{label}</h2>
          {p.location && <span className="badge">At: {p.location}</span>}
        </div>
        <div className="row gap-6">
          {isMid && <>
            <button className="btn btn-sm" style={{ width: 44, padding: 0 }} aria-label={`Move ${label} up`} disabled={i <= 1} onClick={() => movePage(st.id, p.id, -1)}><IconUp /></button>
            <button className="btn btn-sm" style={{ width: 44, padding: 0 }} aria-label={`Move ${label} down`} disabled={i >= st.pages.length - 2} onClick={() => movePage(st.id, p.id, 1)}><IconDown /></button>
          </>}
          <button className="btn btn-sm" disabled={rewriting} onClick={() => void rewritePage(st.id, p.id)}>{rewriting && <Spinner small />}{rewriting ? 'Rewriting…' : 'Rewrite this page'}</button>
          {isMid && <button className="btn btn-sm" aria-label={`Delete ${label}`} disabled={mids <= 1} onClick={() => deletePage(st.id, p.id)}>Delete</button>}
        </div>
      </div>
      <div className="stack gap-14" style={{ padding: 14, opacity: rewriting ? 0.5 : 1 }}>
        {isMid && (
          <div className="row gap-8">
            <span className="label" style={{ margin: 0 }}>Format:</span>
            {layouts.map(([l, t]) => <Chip key={l} small pressed={(p.layout === 'full' ? 'caption' : p.layout) === l} onClick={() => setLayout(st.id, p.id, l)}>{t}</Chip>)}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 14 }}>
          <div>
            <label className="label" htmlFor={`cap-${p.id}`}>{p.kind === 'cover' ? 'Cover title' : isGrid ? 'Narration (top of page)' : p.kind === 'end' ? 'Closing line and seekh' : 'Caption'}</label>
            <textarea className="input" id={`cap-${p.id}`} rows={3} value={p.caption} disabled={rewriting}
              onChange={(e) => { const v = e.target.value; updatePage(st.id, p.id, { caption: v }); if (p.kind === 'cover') updateStory(st.id, (x) => ({ ...x, title: v })); }} />
          </div>
          {!isGrid && (
            <div>
              <label className="label" htmlFor={`pr-${p.id}`}>Picture prompt</label>
              <textarea className="input mono" id={`pr-${p.id}`} rows={4} value={p.imagePrompt} disabled={rewriting} onChange={(e) => updatePage(st.id, p.id, { imagePrompt: e.target.value })} />
            </div>
          )}
        </div>
        {isMid && !isGrid && (
          <div>
            <label className="label" htmlFor={`bb-${p.id}`}>Speech bubble <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <input className="input" id={`bb-${p.id}`} value={p.bubble} disabled={rewriting} onChange={(e) => updatePage(st.id, p.id, { bubble: e.target.value })} />
          </div>
        )}
        {isGrid && (
          <details>
            <summary>6 panels with speech bubbles</summary>
            <PanelEditors st={st} p={p} compact />
          </details>
        )}
      </div>
      {i < st.pages.length - 1 && st.pages.length < MAX_PAGES && (
        <div style={{ borderTop: '3px dashed #141414', padding: '6px 14px' }}>
          <button className="linkbtn" onClick={() => addPageAfter(st.id, p.id)}>+ Add a page after this one</button>
        </div>
      )}
    </li>
  );
}

export function Outline({ st }: { st: Story }) {
  const nav = useNavigate();
  const { rewriting } = useStore();
  if (!st.pages.length) {
    return (
      <div className="panel stack gap-12" style={{ padding: 28, alignItems: 'flex-start', maxWidth: 560 }}>
        <h1 className="h1">No outline yet</h1>
        <p className="m0">Finish the setup, then press Write my katha.</p>
        <button className="btn btn-primary" onClick={() => nav(`/s/${st.id}/katha`)}>Go to Story Plot and Lesson</button>
      </div>
    );
  }
  const pending = pendingSheets(st);
  const grids = st.pages.filter((p) => p.kind === 'middle' && p.layout === 'grid').length;
  const images = st.pages.length - grids + grids * 6;
  const draw = () => { startIllustrating(st.id); nav(`/s/${st.id}/pictures`); };
  return (
    <div className="stack gap-20">
      <div className="row gap-16 between" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <h1 className="h1">Review the katha</h1>
          <p className="muted" style={{ margin: '8px 0 0', maxWidth: '64ch' }}>No pictures have been drawn yet. Edit captions, speech bubbles and prompts; reorder, rewrite or switch a page between a single scene and a six-panel grid.</p>
        </div>
        <button className="btn btn-sm" onClick={() => nav(`/s/${st.id}/katha`)}>Write a new draft</button>
      </div>
      <div style={{ maxWidth: 640 }}>
        <label className="label" htmlFor="story-title">Book title</label>
        <input className="input" id="story-title" style={{ fontFamily: "'Bangers', Impact, sans-serif", fontSize: 26, letterSpacing: '.03em' }} value={st.title}
          onChange={(e) => { const v = e.target.value; updateStory(st.id, (x) => ({ ...x, title: v, pages: x.pages.map((p, k) => (k === 0 ? { ...p, caption: v } : p)) })); }} />
      </div>
      <div className="note"><span><strong>Seekh:</strong> {clean(st.setup.lesson) || 'chosen by Claude from the plot (see the last page)'}</span></div>
      {st.formatReason && <p className="hint m0">{st.formatReason}</p>}
      <ol className="stack gap-18" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {st.pages.map((p, i) => <PageCard key={p.id} st={st} p={p} i={i} rewriting={!!rewriting[p.id]} />)}
      </ol>
      <div className="panel row gap-14 between" style={{ padding: 18, background: '#FFFDF8' }}>
        <div style={{ flex: '1 1 320px' }}>
          <p style={{ margin: 0, fontWeight: 700 }}>This will draw {st.pages.length} pages, cover first{grids ? ` (${grids} as six-panel grids)` : ''}: {images} pictures in all.</p>
          {pending.length > 0 && (
            <p className="err" style={{ margin: '4px 0 0' }}>Approve every character sheet first: {joinNames(pending.map((c) => c.name.trim()))}. <button className="linkbtn" style={{ minHeight: 'auto' }} onClick={() => nav(`/s/${st.id}/paatra`)}>Go to paatra</button></p>
          )}
        </div>
        <button className="btn btn-primary btn-lg" disabled={pending.length > 0} onClick={draw}>Draw the pictures</button>
      </div>
    </div>
  );
}
