// Reader (frontend-spec §3.13): page turns, arrow keys, read aloud, PDF export and print.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../components/Dialogs';
import { IconNext, IconPdf, IconPrev, Spinner } from '../components/Icons';
import { PagePanel } from '../components/PagePanel';
import { Chip } from '../components/Shell';
import { fmtSize, pageText } from '../domain/model';
import type { Paper, Story } from '../domain/types';
import { toast } from '../state/store';

function safeName(st: Story, paper: Paper) {
  const base = (st.title || 'storybook').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-') || 'storybook';
  return `${base}-${paper === 'a4' ? 'A4' : 'Letter'}.pdf`;
}

type Exp = { status: 'idle' } | { status: 'running'; done: number; total: number } | { status: 'ready'; url: string; name: string; meta: string } | { status: 'error'; text: string };

function ExportDialog({ st, paper, setPaper, onClose, onPrint }: { st: Story; paper: Paper; setPaper: (p: Paper) => void; onClose: () => void; onPrint: () => void }) {
  const [exp, setExp] = useState<Exp>({ status: 'idle' });
  const stage = useRef<HTMLDivElement>(null);
  const token = useRef(0);
  const drawn = st.pages.filter((p) => p.versions.length).length;

  useEffect(() => () => { if (exp.status === 'ready') URL.revokeObjectURL(exp.url); }, [exp]);

  const create = async () => {
    const my = ++token.current;
    setExp({ status: 'running', done: 0, total: st.pages.length });
    try {
      // jsPDF and html-to-image are only loaded when someone exports.
      const { buildPdf } = await import('../pdf/exportPdf');
      const blob = await buildPdf(stage.current!, paper, (done, total) => { if (token.current === my) setExp({ status: 'running', done, total }); });
      if (token.current !== my) return;
      setExp({ status: 'ready', url: URL.createObjectURL(blob), name: safeName(st, paper), meta: `${st.pages.length} pages · ${paper === 'a4' ? 'A4' : 'US Letter'} · ${fmtSize(blob.size)}` });
    } catch (e) {
      if (token.current === my) setExp({ status: 'error', text: `Couldn't build the PDF (${e instanceof Error ? e.message : 'unknown error'}). Try again, or use the print dialog.` });
    }
  };
  const pick = (p: Paper) => { token.current++; setPaper(p); setExp({ status: 'idle' }); };

  return (
    <Dialog labelledBy="exp-title" onClose={onClose}>
      <h2 className="h1" id="exp-title" style={{ fontSize: 34 }}>Export as PDF</h2>
      <p className="m0">One comic page per sheet, ready to print at home or send to a print shop.</p>
      <fieldset className="fieldset">
        <legend className="label">Paper size</legend>
        <div className="row gap-10"><Chip pressed={paper === 'a4'} onClick={() => pick('a4')}>A4</Chip><Chip pressed={paper === 'letter'} onClick={() => pick('letter')}>US Letter</Chip></div>
      </fieldset>
      <p className="hint m0">{st.pages.length} pages{drawn < st.pages.length ? ` (${st.pages.length - drawn} not drawn yet)` : ''}.</p>
      {exp.status === 'running' && <div className="note" role="status"><Spinner /><span>Preparing your PDF… page {exp.done} of {exp.total}.</span></div>}
      {exp.status === 'ready' && (
        <div className="note row gap-12" role="status" style={{ background: '#FFF4C2' }}>
          <IconPdf />
          <span style={{ flex: '1 1 200px' }}><strong style={{ overflowWrap: 'anywhere' }}>{exp.name}</strong><br /><span className="muted" style={{ fontSize: 15 }}>{exp.meta}</span></span>
        </div>
      )}
      {exp.status === 'error' && <div className="note note-err" role="alert">{exp.text}</div>}
      <div className="row gap-10 between">
        <button className="linkbtn" onClick={onPrint}>Or use the browser's print dialog</button>
        <div className="row gap-10">
          <button className="btn" onClick={onClose}>Close</button>
          {exp.status === 'ready'
            ? <a className="btn btn-primary" href={exp.url} download={exp.name}>Download PDF</a>
            : <button className="btn btn-primary" onClick={() => void create()} disabled={exp.status === 'running'}>{exp.status === 'error' ? 'Try again' : 'Create PDF'}</button>}
        </div>
      </div>
      {createPortal(
        <div ref={stage} aria-hidden="true" style={{ position: 'fixed', left: -12000, top: 0, width: 794, pointerEvents: 'none' }}>
          {st.pages.map((p, i) => <div key={p.id} data-pdf-page style={{ width: 794, background: '#FFFFFF' }}><PagePanel story={st} page={{ ...p, status: p.versions.length ? 'done' : 'none' }} pageNo={i + 1} /></div>)}
        </div>,
        document.body,
      )}
    </Dialog>
  );
}

export function Reader({ st }: { st: Story }) {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [paper, setPaper] = useState<Paper>('a4');
  const n = st.pages.length;
  const idx = Math.min(i, Math.max(0, n - 1));

  const speak = (k: number) => {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(pageText(st, k));
      u.rate = 0.92; u.pitch = 1.05; u.lang = 'en-IN';
      u.onend = () => setSpeaking(false);
      synth.speak(u);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
      toast("Read aloud isn't available in this browser.", 'warn');
    }
  };
  const turn = (k: number) => {
    const next = Math.max(0, Math.min(n - 1, k));
    setI(next);
    if (speaking) speak(next);
  };
  const toggleSpeak = () => {
    if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return; }
    if (!('speechSynthesis' in window)) { toast("Read aloud isn't available in this browser.", 'warn'); return; }
    speak(idx);
  };
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const print = () => { setExportOpen(false); setTimeout(() => window.print(), 50); };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); turn(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); turn(idx - 1); }
  };

  if (!n) return <p>No pages yet.</p>;
  return (
    <>
      <div className="stack gap-18 no-print" style={{ alignItems: 'center' }} onKeyDown={onKey}>
        <div className="row gap-10" style={{ justifyContent: 'center' }}>
          <button className="btn btn-sm" aria-pressed={speaking} onClick={toggleSpeak}>{speaking ? 'Stop reading' : 'Read aloud'}</button>
          <button className="btn btn-sm btn-blue" onClick={() => setExportOpen(true)}>Export PDF</button>
          <button className="btn btn-sm btn-quiet" onClick={() => nav(`/s/${st.id}/pictures`)}>Edit pages</button>
        </div>
        <div style={{ width: '100%', maxWidth: 540 }}>
          <div style={{ boxShadow: '8px 8px 0 #141414' }}><PagePanel story={st} page={st.pages[idx]} pageNo={idx + 1} /></div>
        </div>
        <div className="row gap-14" style={{ flexWrap: 'nowrap' }}>
          <button className="btn btn-lg" aria-label="Previous page" disabled={idx === 0} onClick={() => turn(idx - 1)}><IconPrev size={24} /></button>
          <span role="status" style={{ fontWeight: 700, minWidth: 110, textAlign: 'center' }}>Page {idx + 1} of {n}</span>
          <button className="btn btn-lg btn-primary" aria-label="Next page" disabled={idx === n - 1} onClick={() => turn(idx + 1)}><IconNext size={24} /></button>
        </div>
        <p className="hint m0">Tip: use the left and right arrow keys while a button is focused. Share links arrive with the online version; for now, export a PDF to share.</p>
      </div>
      {exportOpen && <ExportDialog st={st} paper={paper} setPaper={setPaper} onClose={() => setExportOpen(false)} onPrint={print} />}
      <div className="print-root">
        <style>{`@page{size:${paper === 'a4' ? 'A4' : 'letter'};margin:${paper === 'a4' ? '10mm' : '0.4in'}}`}</style>
        {st.pages.map((p, k) => (
          <div key={p.id} style={{ breakAfter: k < n - 1 ? 'page' : 'auto', breakInside: 'avoid', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: paper === 'a4' ? '190mm' : '7.2in' }}><PagePanel story={st} page={{ ...p, status: p.versions.length ? 'done' : 'none' }} pageNo={k + 1} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
