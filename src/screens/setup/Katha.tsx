// Step 5 · Katha (frontend-spec §3.8).

import { useNavigate } from 'react-router-dom';
import { Chip } from '../../components/Shell';
import { AGES, COUNTS, DARSHANS, INSPIRATIONS, LESSON_IDEAS, STYLES, TONES } from '../../domain/constants';
import { chooseFormat, clean, drivesOf, joinNames, kaalPhrase, missingForWriting } from '../../domain/model';
import type { FormatChoice, Setup, Story } from '../../domain/types';
import { askConfirm } from '../../state/store';
import { useSetup } from './SetupSteps';

function FormatIcon({ f }: { f: FormatChoice }) {
  return (
    <svg width="40" height="54" viewBox="0 0 40 54" aria-hidden="true">
      <rect x="2" y="2" width="36" height="50" fill="#FFFFFF" stroke="#141414" strokeWidth="2.5" />
      {f === 'single' && <g><rect x="6" y="6" width="28" height="30" fill="#7FB2FF" stroke="#141414" strokeWidth="2" /><rect x="6" y="40" width="28" height="8" fill="#FFD93B" stroke="#141414" strokeWidth="2" /></g>}
      {f === 'grid' && <g>{[0, 1, 2].flatMap((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={6 + c * 15} y={6 + r * 14} width="13" height="12" fill={(r + c) % 2 ? '#8FD3A8' : '#7FB2FF'} stroke="#141414" strokeWidth="1.8" />))}</g>}
      {f === 'auto' && <g><path d="M20 12l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#FFD93B" stroke="#141414" strokeWidth="2" strokeLinejoin="round" /><rect x="8" y="38" width="24" height="8" fill="#FF4A3D" stroke="#141414" strokeWidth="2" /></g>}
    </svg>
  );
}

export function Katha({ st }: { st: Story }) {
  const nav = useNavigate();
  const upd = useSetup(st);
  const s = st.setup;
  const set = <K extends keyof Setup>(k: K, v: Setup[K]) => upd((x) => ({ ...x, [k]: v }));
  const fmt = chooseFormat(s, st.characters);
  const missing = missingForWriting(st);
  const named = st.characters.filter((c) => c.name.trim());
  const keyNames = named.filter((c) => c.isKey).map((c) => { const d = drivesOf(c); return c.name.trim() + (d.length ? ` (${d.join(', ')})` : ''); });
  const formats: [FormatChoice, string, string][] = [
    ['auto', 'Auto', 'Picks per story: simple tales get single scenes, richer ones get comic grids.'],
    ['single', 'Single scene', 'One picture per page with a short caption below.'],
    ['grid', '3×2 comic grid', 'Six panels per page, each with a speech bubble. Six pictures per page, so it costs more.'],
  ];
  const write = () => {
    if (missing.length) return;
    const go = () => nav(`/s/${st.id}/writing?start=1`);
    if (st.pages.length) {
      askConfirm({ title: 'Write a brand-new draft?', body: 'Your current outline and any edits will be replaced, and drawn pictures will be cleared from these pages.', yes: 'Write new draft', run: go });
    } else go();
  };
  const glance = [
    ['Desh', clean(s.desh.main) + (s.desh.subs.filter(Boolean).length ? ` (${s.desh.subs.filter(Boolean).join(', ')})` : '') || '[no place yet]', 'desh'],
    ['Kaal', kaalPhrase(s.kaal).replace(/^./, (m) => m.toUpperCase()), 'kaal'],
    ['Paatra', keyNames.length ? keyNames.join(' · ') + (named.length > keyNames.length ? ` + ${named.length - keyNames.length} more` : '') : joinNames(named.map((c) => c.name.trim())) || 'Add your paatra', 'paatra'],
    ['Paristhiti', clean(s.paristhiti) ? (s.paristhiti.length > 110 ? `${s.paristhiti.slice(0, 107)}…` : s.paristhiti) : '[not set: optional, but it makes the story richer]', 'paristhiti'],
  ];
  return (
    <div className="stack gap-24" style={{ maxWidth: 900 }}>
      <div>
        <p className="kicker">Step 5 · Story Plot and Lesson</p>
        <h1 className="h1">The story and its lesson</h1>
        <p className="muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>Claude writes a page-by-page outline from everything you've set up. You can change any page before pictures are drawn.</p>
      </div>
      <fieldset className="fieldset">
        <legend className="label">Inspired by <span className="muted" style={{ fontWeight: 400 }}>(choose any)</span></legend>
        <div className="row gap-10">
          {INSPIRATIONS.map((t) => <Chip key={t} pressed={s.inspiration.includes(t)} onClick={() => set('inspiration', s.inspiration.includes(t) ? s.inspiration.filter((x) => x !== t) : s.inspiration.concat([t]))}>{t}</Chip>)}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="katha">Main story or plot</label>
        <textarea className="input" id="katha" rows={6} value={s.katha} onChange={(e) => set('katha', e.target.value)}
          placeholder="e.g. Chiku promised Neela she could always shelter on his island. When the other monkeys object, Chiku must choose between fitting in and keeping his word." />
      </div>
      <div>
        <label className="label" htmlFor="lesson">Life lesson (seekh)</label>
        <input className="input" id="lesson" value={s.lesson} onChange={(e) => set('lesson', e.target.value)} placeholder="e.g. A promise is a small piece of dharma we carry with us" />
        <div className="row gap-8" style={{ marginTop: 10 }}>{LESSON_IDEAS.map((t) => <Chip key={t} small style={{ fontWeight: 400 }} onClick={() => set('lesson', t)}>{t}</Chip>)}</div>
      </div>
      <fieldset className="fieldset">
        <legend className="label">Darshan lens <span className="muted" style={{ fontWeight: 400 }}>(optional: the philosophical thread under the story)</span></legend>
        <div className="row gap-10">{DARSHANS.map((t) => <Chip key={t} pressed={s.darshan === t} onClick={() => set('darshan', t)}>{t}</Chip>)}</div>
      </fieldset>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: 24 }}>
        <fieldset className="fieldset"><legend className="label">Tone</legend><div className="row gap-8">{TONES.map((t) => <Chip key={t} small pressed={s.tone === t} onClick={() => set('tone', t)}>{t}</Chip>)}</div></fieldset>
        <fieldset className="fieldset"><legend className="label">Reading age</legend><div className="row gap-8">{AGES.map((t) => <Chip key={t} small pressed={s.age === t} onClick={() => set('age', t)}>{t}</Chip>)}</div></fieldset>
        <fieldset className="fieldset"><legend className="label">Pages (with cover and ending)</legend><div className="row gap-8">{COUNTS.map((t) => <Chip key={t} small pressed={s.pageCount === t} onClick={() => set('pageCount', t)}>{t} pages</Chip>)}</div></fieldset>
        <fieldset className="fieldset"><legend className="label">Art style</legend><div className="row gap-8">{STYLES.map((t) => <Chip key={t} small pressed={s.style === t} onClick={() => set('style', t)}>{t}</Chip>)}</div></fieldset>
      </div>
      <fieldset className="fieldset stack gap-12">
        <legend className="label">Page format</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
          {formats.map(([f, label, desc]) => (
            <button key={f} className="pa" aria-pressed={s.format === f} onClick={() => set('format', f)}
              style={{ background: s.format === f ? '#FFD93B' : '#FFFFFF', boxShadow: s.format === f ? '3px 3px 0 #141414' : 'none', flexDirection: 'column', gap: 8 }}>
              <span className="row gap-10" style={{ flexWrap: 'nowrap' }}><FormatIcon f={f} /><span style={{ fontFamily: "'Bangers', Impact, sans-serif", fontSize: 20, letterSpacing: '.04em' }}>{label}</span></span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{desc}</span>
            </button>
          ))}
        </div>
        <div className="note"><span>{fmt.reason}</span></div>
      </fieldset>
      <div className="panel stack gap-10" style={{ padding: 18, background: '#FFFDF8' }}>
        <h2 className="h2">Your katha at a glance</h2>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 16px' }}>
          {glance.map(([k, v, step]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt style={{ fontWeight: 700 }}>{k}</dt>
              <dd style={{ margin: 0 }}>{v} <button className="linkbtn" style={{ minHeight: 'auto', fontSize: 15 }} onClick={() => nav(`/s/${st.id}/${step}`)}>edit</button></dd>
            </div>
          ))}
        </dl>
      </div>
      {missing.length > 0 && <div className="note note-warn" role="status"><span><strong>Before writing:</strong> add {joinNames(missing)}.</span></div>}
      <div className="row gap-12 between">
        <button className="btn" onClick={() => nav(`/s/${st.id}/paristhiti`)}>Back</button>
        <button className="btn btn-primary btn-lg" onClick={write} disabled={missing.length > 0}>{st.pages.length ? 'Write a new draft' : 'Write my katha'}</button>
      </div>
    </div>
  );
}
