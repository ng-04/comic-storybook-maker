// Page editor (frontend-spec §3.12): edit text and prompts, redraw (Ctrl/Cmd+Enter), pick a version.

import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconInfo, IconNext, IconPrev, Spinner } from '../components/Icons';
import { PagePanel } from '../components/PagePanel';
import { Chip } from '../components/Shell';
import { activeVersion, pageLabel } from '../domain/model';
import type { Layout, Story } from '../domain/types';
import { drawPage, setLayout, toast, updatePage, updateStory, useStore } from '../state/store';
import { PanelEditors } from './Outline';

export function PageEditor({ st }: { st: Story }) {
  const nav = useNavigate();
  const { pageId } = useParams();
  const { online } = useStore();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const i = Math.max(0, st.pages.findIndex((p) => p.id === pageId));
  const p = st.pages[i];
  if (!p) return <p>That page no longer exists.</p>;
  const isMid = p.kind === 'middle';
  const isGrid = isMid && p.layout === 'grid';
  const drawing = p.status === 'drawing';
  const v = activeVersion(p);
  const go = (k: number) => nav(`/s/${st.id}/pages/${st.pages[k].id}`, { replace: true });

  const redraw = () => {
    if (drawing) return;
    if (!isGrid && !p.imagePrompt.trim()) { toast('Write a picture prompt first.', 'warn'); return; }
    if (isGrid && !p.panels.some((x) => x.prompt.trim())) { toast('Write at least one panel prompt first.', 'warn'); return; }
    void drawPage(st.id, p.id);
  };
  const onPromptKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); redraw(); } };
  const layouts: [Layout, string][] = [['caption', 'Single scene'], ['grid', '3×2 comic grid'], ['full', 'Full picture']];

  return (
    <div className="stack gap-18">
      <div className="row gap-10 between">
        <button className="btn btn-sm" onClick={() => nav(`/s/${st.id}/pictures`)}>All pages</button>
        <div className="row gap-8" style={{ flexWrap: 'nowrap' }}>
          <button className="btn btn-sm" style={{ width: 44, padding: 0 }} aria-label="Previous page" disabled={i === 0} onClick={() => go(i - 1)}><IconPrev /></button>
          <span style={{ fontWeight: 700, minWidth: 110, textAlign: 'center' }}>{pageLabel(p, i)}</span>
          <button className="btn btn-sm" style={{ width: 44, padding: 0 }} aria-label="Next page" disabled={i === st.pages.length - 1} onClick={() => go(i + 1)}><IconNext /></button>
        </div>
      </div>
      <div className="row gap-24" style={{ alignItems: 'flex-start' }}>
        <div className="stack gap-14" style={{ flex: '1 1 320px', maxWidth: 460, minWidth: 0 }}>
          <div style={{ boxShadow: '7px 7px 0 #141414' }}><PagePanel story={st} page={p} pageNo={i + 1} /></div>
          {p.versions.length > 1 && (
            <div>
              <h2 className="label">Versions</h2>
              <div className="versions">
                {p.versions.map((ver, k) => {
                  const active = ver.id === v?.id;
                  return (
                    <button key={ver.id} className="tile" style={{ width: 86, flex: '0 0 auto' }} aria-pressed={active} aria-label={`Use version ${k + 1}`} onClick={() => updatePage(st.id, p.id, { activeVersionId: ver.id })}>
                      <div style={{ outline: active ? '4px solid #1F4FB8' : 'none', outlineOffset: 3 }}><PagePanel story={st} page={p} version={ver} /></div>
                      <span style={{ display: 'block', textAlign: 'center', fontWeight: 700, fontSize: 14, marginTop: 6 }}>v{k + 1}{ver.note ? ' · fallback' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="stack gap-18" style={{ flex: '999 1 380px', minWidth: 0 }}>
          {drawing && <div className="note" role="status"><Spinner /><strong>Drawing a new version…</strong></div>}
          {!drawing && v?.note && <div className="note" role="status"><IconInfo /><span><strong>Heads up:</strong> {v.note}</span></div>}
          {!drawing && p.error && (
            <div className="note note-err stack gap-6" role="alert" style={{ alignItems: 'flex-start' }}>
              <strong>We couldn't draw this page.</strong>
              <span>{p.error.message} ({p.error.code}). {/IMAGE_/.test(p.error.code) ? 'Simplifying the prompt usually fixes it: describe the scene plainly and remove anything that could read as unsafe.' : ''}</span>
              <button className="linkbtn" onClick={() => promptRef.current?.focus()}>Edit the prompt below, then redraw</button>
            </div>
          )}
          <div>
            <label className="label" htmlFor="ed-caption">{p.kind === 'cover' ? 'Cover title' : isGrid ? 'Narration' : p.kind === 'end' ? 'Closing line and seekh' : 'Caption'}</label>
            <textarea className="input" id="ed-caption" rows={3} value={p.caption}
              onChange={(e) => { const val = e.target.value; updatePage(st.id, p.id, { caption: val }); if (p.kind === 'cover') updateStory(st.id, (x) => ({ ...x, title: val })); }} />
          </div>
          {isMid && st.mode !== 'simple' && (
            <fieldset className="fieldset">
              <legend className="label">Format</legend>
              <div className="row gap-8">{layouts.map(([l, t]) => <Chip key={l} pressed={p.layout === l} onClick={() => setLayout(st.id, p.id, l)}>{t}</Chip>)}</div>
              {p.versions.length > 0 && <p className="hint">Switching between a single picture and a grid needs a redraw.</p>}
            </fieldset>
          )}
          {isMid && !isGrid && (
            <div>
              <label className="label" htmlFor="ed-bubble">Speech bubble <span className="muted" style={{ fontWeight: 400 }}>(optional, real text over the picture)</span></label>
              <input className="input" id="ed-bubble" value={p.bubble} placeholder={'e.g. "I gave my word, Neela."'} onChange={(e) => updatePage(st.id, p.id, { bubble: e.target.value })} />
            </div>
          )}
          {isGrid ? (
            <div className="stack gap-10"><h2 className="label m0">Panels</h2><PanelEditors st={st} p={p} onPromptKey={onPromptKey} /></div>
          ) : (
            <div>
              <label className="label" htmlFor="ed-prompt">Picture prompt</label>
              <textarea ref={promptRef} className="input mono" id="ed-prompt" rows={6} value={p.imagePrompt} onKeyDown={onPromptKey} onChange={(e) => updatePage(st.id, p.id, { imagePrompt: e.target.value })} />
            </div>
          )}
          <p className="hint m0">Pictures never include words; captions and bubbles are added as text. Press Ctrl + Enter in a prompt to redraw.</p>
          <div className="row gap-10">
            <button className="btn btn-primary btn-lg" disabled={drawing || !online} onClick={redraw}>{drawing ? 'Drawing…' : isGrid ? 'Redraw all 6 panels' : p.versions.length ? 'Redraw' : 'Draw this page'}</button>
            <span className="hint m0">{online ? 'Earlier versions are kept below the page.' : "You're offline."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
