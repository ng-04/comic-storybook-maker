// Steps 1, 2 and 4 of the setup: Desh, Kaal and Paristhiti (frontend-spec §3.4, 3.5, 3.7).

import { useNavigate } from 'react-router-dom';
import { ReferenceTray } from '../../components/ReferenceTray';
import { Chip } from '../../components/Shell';
import { IconX } from '../../components/Icons';
import { DESH_IDEAS, ERAS, MAX_SUBLOCATIONS, RITUS, SUB_IDEAS } from '../../domain/constants';
import { heroOf, settingLine } from '../../domain/model';
import type { Setup, Story } from '../../domain/types';
import { addRefFiles, removeRef, updateStory } from '../../state/store';

export function useSetup(st: Story) {
  return (fn: (s: Setup) => Setup) => updateStory(st.id, (x) => ({ ...x, setup: fn(x.setup) }));
}

export function Desh({ st }: { st: Story }) {
  const nav = useNavigate();
  const upd = useSetup(st);
  const subs = st.setup.desh.subs;
  const full = subs.length >= MAX_SUBLOCATIONS;
  const setSubs = (fn: (s: string[]) => string[]) => upd((x) => ({ ...x, desh: { ...x.desh, subs: fn(x.desh.subs) } }));
  return (
    <div className="narrow">
      <div>
        <p className="kicker">Step 1 · Desh</p>
        <h1 className="h1">Where does the story happen?</h1>
        <p className="muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>Name the main place, then the smaller spots where scenes unfold. Each page of the comic is set in one of these.</p>
      </div>
      <div>
        <label className="label" htmlFor="desh-main">Main place (desh)</label>
        <input className="input" id="desh-main" value={st.setup.desh.main} placeholder="e.g. A forest on the banks of the Narmada"
          onChange={(e) => upd((x) => ({ ...x, desh: { ...x.desh, main: e.target.value } }))} />
        <div className="row gap-8" style={{ marginTop: 10 }}>
          <span className="hint" style={{ margin: 0 }}>Ideas:</span>
          {DESH_IDEAS.map((t) => <Chip key={t} small style={{ fontWeight: 400 }} onClick={() => upd((x) => ({ ...x, desh: { ...x.desh, main: t } }))}>{t}</Chip>)}
        </div>
      </div>
      <div className="panel stack gap-14" style={{ padding: 18 }}>
        <h2 className="h2">Sublocations</h2>
        <p className="muted m0">The banyan tree, the river ghat, the palace courtyard… Up to {MAX_SUBLOCATIONS}.</p>
        {subs.length > 0 ? (
          <ol className="stack gap-10" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {subs.map((v, i) => (
              <li key={i} className="row gap-10" style={{ flexWrap: 'nowrap' }}>
                <span aria-hidden="true" style={{ flex: '0 0 auto', width: 36, height: 36, border: '3px solid #141414', borderRadius: '50%', background: '#FFD93B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bangers', Impact, sans-serif", fontSize: 18 }}>{i + 1}</span>
                <label className="sr-only" htmlFor={`sub-${i}`}>Sublocation {i + 1}</label>
                <input className="input" id={`sub-${i}`} value={v} onChange={(e) => setSubs((s) => s.map((y, k) => (k === i ? e.target.value : y)))} />
                <button className="btn btn-sm" style={{ width: 44, padding: 0, flex: '0 0 auto' }} aria-label={`Remove sublocation ${i + 1}`} onClick={() => setSubs((s) => s.filter((_, k) => k !== i))}><IconX size={16} /></button>
              </li>
            ))}
          </ol>
        ) : <p className="hint m0">No sublocations yet. One is enough for a short tale.</p>}
        <div className="row gap-8">
          <button className="btn btn-sm btn-primary" disabled={full} onClick={() => setSubs((s) => s.concat(['']))}>+ Add a sublocation</button>
          {SUB_IDEAS.filter((t) => !subs.includes(t)).map((t) => <Chip key={t} small disabled={full} style={{ fontWeight: 400 }} onClick={() => setSubs((s) => (s.length >= MAX_SUBLOCATIONS ? s : s.concat([t])))}>{t}</Chip>)}
        </div>
      </div>
      <div className="panel stack gap-12" style={{ padding: 18, background: '#FFFDF8' }}>
        <h2 className="h2">Reference images for places <span className="muted" style={{ fontFamily: "'Comic Neue', sans-serif", fontSize: 15, letterSpacing: 0 }}>(optional)</span></h2>
        <p className="muted m0">A temple you visited, a painting style you like, a photo of your village. Add several if you like.</p>
        <ReferenceTray refs={st.setup.placeRefs} heic={false} onAdd={(f) => void addRefFiles(st.id, { type: 'place' }, f)} onRemove={(r) => void removeRef(st.id, { type: 'place' }, r)} />
      </div>
      <div className="row gap-12 end">
        <button className="btn btn-primary btn-lg" onClick={() => nav(`/s/${st.id}/kaal`)}>Next: Kaal</button>
      </div>
    </div>
  );
}

export function Kaal({ st }: { st: Story }) {
  const nav = useNavigate();
  const upd = useSetup(st);
  const k = st.setup.kaal;
  const setK = (patch: Partial<Setup['kaal']>) => upd((x) => ({ ...x, kaal: { ...x.kaal, ...patch } }));
  return (
    <div className="narrow">
      <div>
        <p className="kicker">Step 2 · Kaal</p>
        <h1 className="h1">When does it happen?</h1>
        <p className="muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>The time period shapes clothes, buildings and how people speak. "Long, long ago" works perfectly for fables.</p>
      </div>
      <fieldset className="fieldset">
        <legend className="label">Time period</legend>
        <div className="row gap-10">{ERAS.map((e) => <Chip key={e} pressed={k.era === e} onClick={() => setK({ era: e })}>{e}</Chip>)}</div>
      </fieldset>
      <div>
        <label className="label" htmlFor="kaal-custom">Or describe it in your words <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
        <input className="input" id="kaal-custom" value={k.custom} onChange={(e) => setK({ custom: e.target.value })} placeholder="e.g. The year the great banyan was planted, when kings still travelled by elephant" />
      </div>
      <fieldset className="fieldset">
        <legend className="label">Season (ritu) <span className="muted" style={{ fontWeight: 400 }}>(optional, click again to clear)</span></legend>
        <div className="row gap-10">{RITUS.map((r) => <Chip key={r} pressed={k.ritu === r} onClick={() => setK({ ritu: k.ritu === r ? '' : r })}>{r}</Chip>)}</div>
      </fieldset>
      <div className="note"><span><strong>So far:</strong> {settingLine(st.setup)}</span></div>
      <div className="row gap-12 between">
        <button className="btn" onClick={() => nav(`/s/${st.id}/desh`)}>Back</button>
        <button className="btn btn-primary btn-lg" onClick={() => nav(`/s/${st.id}/paatra`)}>Next: Paatra</button>
      </div>
    </div>
  );
}

export function Paristhiti({ st }: { st: Story }) {
  const nav = useNavigate();
  const upd = useSetup(st);
  const hero = heroOf(st.characters)?.name.trim() || 'your nayak';
  const prompts = ['What changed just before the story?', 'Who is in trouble?', 'What rule or promise is being tested?', `Why can't ${hero} simply walk away?`];
  return (
    <div className="narrow">
      <div>
        <p className="kicker">Step 4 · Paristhiti</p>
        <h1 className="h1">What led to this moment?</h1>
        <p className="muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>The circumstances before the story begins: what happened, what changed, and what's now at stake for {hero}.</p>
      </div>
      <div>
        <label className="label" htmlFor="paristhiti">The situation</label>
        <textarea className="input" id="paristhiti" rows={6} value={st.setup.paristhiti} onChange={(e) => upd((x) => ({ ...x, paristhiti: e.target.value }))}
          placeholder="e.g. The monsoon came early. The river flooded the crocodile's home, and the only safe place left is the monkey's island, which the other monkeys refuse to share." />
        <div className="row gap-8" style={{ marginTop: 10 }}>
          <span className="hint" style={{ margin: 0 }}>Think about:</span>
          {prompts.map((t) => <Chip key={t} small style={{ fontWeight: 400 }} onClick={() => upd((x) => ({ ...x, paristhiti: `${x.paristhiti ? `${x.paristhiti.trim()}\n` : ''}${t} ` }))}>{t}</Chip>)}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="stakes">What's at stake? <span className="muted" style={{ fontWeight: 400 }}>(one line, optional)</span></label>
        <input className="input" id="stakes" value={st.setup.stakes} onChange={(e) => upd((x) => ({ ...x, stakes: e.target.value }))} placeholder="e.g. A friendship, and a promise made long ago" />
      </div>
      <div className="row gap-12 between">
        <button className="btn" onClick={() => nav(`/s/${st.id}/paatra`)}>Back</button>
        <button className="btn btn-primary btn-lg" onClick={() => nav(`/s/${st.id}/katha`)}>Next: Story Plot and Lesson</button>
      </div>
    </div>
  );
}
