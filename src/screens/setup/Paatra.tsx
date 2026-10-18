// Step 3 · Paatra: character cards, purusharthas, reference images and character sheets (frontend-spec §3.6).

import { useNavigate } from 'react-router-dom';
import { CharacterIcon, GenderToggleIcon } from '../../components/CharacterIcon';
import { IconCheck, IconPlus, Spinner } from '../../components/Icons';
import { ReferenceTray } from '../../components/ReferenceTray';
import { askDeleteImages } from '../../components/Shell';
import { PURUSHARTHAS, ROLE_LABELS, ROLE_OPTIONS } from '../../domain/constants';
import type { Character, Form, Role, Story } from '../../domain/types';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import { addCharacter, addRefFiles, approveSheet, drawSheet, removeCharacter, removeRef, updateChar } from '../../state/store';

const STRIPES: Partial<Record<Role, [string, string]>> = { nayak: ['#1F4FB8', '#FFFFFF'], pratinayak: ['#FF4A3D', '#141414'], guru: ['#8A4FD1', '#FFFFFF'] };

function SheetPreview({ c }: { c: Character }) {
  const sh = c.sheet;
  const v = sh.versions[sh.active];
  const url = useBlobUrl(v?.blobId);
  return (
    <div className="sheetbox">
      {v && sh.status !== 'drawing' && url && <img src={url} alt={`Cartoon character sheet for ${c.name || 'this character'}`} />}
      {!v && sh.status !== 'drawing' && <div className="center-fill" style={{ fontWeight: 700, color: '#4A4A4A' }}>No sheet yet. Describe them, then draw one.</div>}
      {sh.status === 'drawing' && (
        <div className="center-fill stripes" role="status">
          <span className="row gap-8" style={{ background: '#FFFFFF', border: '3px solid #141414', padding: '6px 12px', fontWeight: 700 }}><Spinner />Drawing sheet…</span>
        </div>
      )}
      {sh.status === 'approved' && <span className="badge b-done" style={{ position: 'absolute', top: 8, left: 8 }}><IconCheck size={14} />Approved</span>}
    </div>
  );
}

function CharacterCard({ st, c, canRemove }: { st: Story; c: Character; canRemove: boolean }) {
  const upd = (patch: Partial<Character> | ((x: Character) => Partial<Character>)) => updateChar(st.id, c.id, patch);
  const [stripe, stripeInk] = STRIPES[c.role] || ['#FFD93B', '#141414'];
  const dn = c.name.trim() || 'this character';
  const sh = c.sheet;
  const note = sh.versions[sh.active]?.note;
  return (
    <article className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="strip" style={{ background: stripe }}>
        <div className="row gap-12" style={{ minWidth: 0, flexWrap: 'nowrap' }}>
          <CharacterIcon c={c} />
          <div style={{ minWidth: 0 }}>
            <h2 className="h2" style={{ color: stripeInk, overflowWrap: 'anywhere' }}>{c.name.trim() || `New ${ROLE_LABELS[c.role].toLowerCase()}`}</h2>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: stripeInk }}>{ROLE_LABELS[c.role]} · {c.gender === 'female' ? 'Female' : 'Male'} · {c.form}{c.isKey ? ' · key' : ''}</p>
          </div>
        </div>
        {canRemove && <button className="btn btn-sm" onClick={() => removeCharacter(st.id, c)}>Remove</button>}
      </div>
      <div className="stack gap-18" style={{ padding: 18 }}>
        <div className="row gap-20" style={{ alignItems: 'flex-start' }}>
          <div className="stack gap-14" style={{ flex: '999 1 320px', minWidth: 0 }}>
            <fieldset className="fieldset">
              <legend className="label">Male or female</legend>
              <div className="row gap-10">
                <button className="gtog" aria-pressed={c.gender !== 'female'} onClick={() => upd({ gender: 'male' })}><GenderToggleIcon female={false} />Male</button>
                <button className="gtog" aria-pressed={c.gender === 'female'} onClick={() => upd({ gender: 'female' })}><GenderToggleIcon female />Female</button>
              </div>
            </fieldset>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 14 }}>
              <div>
                <label className="label" htmlFor={`n-${c.id}`}>Name</label>
                <input className="input" id={`n-${c.id}`} value={c.name} onChange={(e) => upd({ name: e.target.value })} placeholder="e.g. Chiku" />
              </div>
              <div>
                <label className="label" htmlFor={`fm-${c.id}`}>Form</label>
                <select className="input" id={`fm-${c.id}`} value={c.form} onChange={(e) => upd({ form: e.target.value as Form })}>
                  {['Human', 'Animal', 'Bird', 'Divine being'].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor={`r-${c.id}`}>Role</label>
                <select className="input" id={`r-${c.id}`} value={c.role} onChange={(e) => { const r = e.target.value as Role; upd((x) => ({ role: r, isKey: r === 'nayak' || r === 'pratinayak' ? true : x.isKey })); }}>
                  {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor={`a-${c.id}`}>Age</label>
                <input className="input" id={`a-${c.id}`} inputMode="numeric" value={c.age} onChange={(e) => upd({ age: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor={`d-${c.id}`}>What do they look like?</label>
              <textarea className="input" id={`d-${c.id}`} rows={2} value={c.appearance} onChange={(e) => upd({ appearance: e.target.value })} placeholder="e.g. A small grey monkey with a red thread tied on one wrist" />
            </div>
            <label className="row gap-10" style={{ fontWeight: 700, minHeight: 44, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 22, height: 22, accentColor: '#1F4FB8' }} checked={c.isKey} disabled={c.role === 'nayak'} onChange={(e) => upd({ isKey: e.target.checked })} />
              Key character (shapes the plot)
            </label>
          </div>

          <div className="stack gap-10" style={{ flex: '1 1 240px', minWidth: 0 }}>
            <span className="label" style={{ margin: 0 }}>Character sheet</span>
            <SheetPreview c={c} />
            {note && sh.status !== 'drawing' && <div className="note" style={{ fontSize: 15 }}><span>{note}</span></div>}
            {sh.error && sh.status !== 'drawing' && <div className="note note-err" role="alert" style={{ fontSize: 15 }}><span><strong>We couldn't draw this sheet.</strong> {sh.error}</span></div>}
            <div className="row gap-8">
              {(sh.status === 'none' || sh.status === 'failed') && <button className="btn btn-sm btn-blue" onClick={() => void drawSheet(st.id, c.id)}>{sh.status === 'failed' ? 'Try again' : 'Draw character sheet'}</button>}
              {sh.status === 'review' && <>
                <button className="btn btn-sm btn-primary" onClick={() => approveSheet(st.id, c)}>Approve</button>
                <button className="btn btn-sm" onClick={() => void drawSheet(st.id, c.id)}>Regenerate</button>
              </>}
              {sh.status === 'approved' && <button className="btn btn-sm" onClick={() => void drawSheet(st.id, c.id)}>Regenerate</button>}
            </div>
          </div>
        </div>

        {c.isKey && (
          <fieldset style={{ border: '3px dashed #141414', borderRadius: 10, margin: 0, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <legend className="label" style={{ padding: '0 6px', margin: 0 }}>What drives {dn}? <span className="muted" style={{ fontWeight: 400 }}>Choose one or more purusharthas</span></legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 10 }}>
              {PURUSHARTHAS.map((p) => {
                const v = c.purushartha[p.k];
                const on = !!v?.on;
                return (
                  <div key={p.k} className="stack gap-8">
                    <button className="pa" aria-pressed={on} style={{ background: on ? p.bg : '#FFFFFF', color: on ? p.ink : '#141414', boxShadow: on ? '3px 3px 0 #141414' : 'none' }}
                      onClick={() => upd((x) => ({ purushartha: { ...x.purushartha, [p.k]: { ...x.purushartha[p.k], on: !on } } }))}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={on ? p.ink : '#141414'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 2 }}><path d={p.icon} /></svg>
                      <span><span style={{ display: 'block', fontFamily: "'Bangers', Impact, sans-serif", fontSize: 20, letterSpacing: '.04em' }}>{p.k}</span><span style={{ fontSize: 14, fontWeight: 700 }}>{p.hint}</span></span>
                    </button>
                    {on && (
                      <div>
                        <label className="label" style={{ fontSize: 15 }} htmlFor={`pa-${p.k}-${c.id}`}>{p.question.replace('{n}', dn)}</label>
                        <input className="input" style={{ fontSize: 15, minHeight: 44 }} id={`pa-${p.k}-${c.id}`} value={v.note} placeholder={p.placeholder}
                          onChange={(e) => { const note = e.target.value; upd((x) => ({ purushartha: { ...x.purushartha, [p.k]: { ...x.purushartha[p.k], note } } })); }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="stack gap-8">
          <span className="label" style={{ margin: 0 }}>Reference images <span className="muted" style={{ fontWeight: 400 }}>(optional, add several)</span></span>
          <ReferenceTray refs={c.refs} onAdd={(f) => void addRefFiles(st.id, { type: 'char', id: c.id }, f)} onRemove={(r) => void removeRef(st.id, { type: 'char', id: c.id }, r)} />
        </div>
      </div>
    </article>
  );
}

export function Paatra({ st }: { st: Story }) {
  const nav = useNavigate();
  const chars = st.characters;
  const heroMissing = !chars.some((c) => c.role === 'nayak' && c.name.trim());
  const nayaks = chars.filter((c) => c.role === 'nayak').length;
  const named = chars.filter((c) => c.name.trim());
  const approved = named.filter((c) => c.sheet.status === 'approved').length;
  const toDraw = chars.filter((c) => (c.sheet.status === 'none' || c.sheet.status === 'failed') && (c.name.trim() || c.appearance.trim()));
  const photoCount = chars.reduce((n, c) => n + c.refs.length, 0) + st.setup.placeRefs.length;
  return (
    <div className="row gap-24" style={{ alignItems: 'flex-start' }}>
      <div className="stack gap-24" style={{ flex: '999 1 600px', minWidth: 0 }}>
        <div>
          <p className="kicker">Step 3 · Paatra</p>
          <h1 className="h1">Who's in the story?</h1>
          <p className="muted" style={{ margin: '8px 0 0', maxWidth: '64ch' }}>Every katha needs a nayak. For key characters, choose what drives them: the four purusharthas. Approve each cartoon sheet; it's the reference for every page.</p>
        </div>
        {heroMissing && <div className="note note-warn" role="status"><strong>Give your nayak a name to continue.</strong></div>}
        {chars.map((c) => <CharacterCard key={c.id} st={st} c={c} canRemove={!(c.role === 'nayak' && nayaks === 1)} />)}
        <div className="panel row gap-10" style={{ padding: 16, boxShadow: 'none', borderStyle: 'dashed' }}>
          <span style={{ fontWeight: 700, marginRight: 6 }}>Add a paatra:</span>
          {(['nayak', 'sahayak', 'mitra', 'guru', 'parivaar', 'pratinayak'] as Role[]).filter((r) => r !== 'nayak' || nayaks === 0).map((r) => (
            <button key={r} className="chip" onClick={() => addCharacter(st.id, r)}><IconPlus size={16} />{ROLE_LABELS[r]}</button>
          ))}
        </div>
        <div className="row gap-12 between">
          <button className="btn" onClick={() => nav(`/s/${st.id}/kaal`)}>Back</button>
          <div className="row gap-10">
            <span className="muted" style={{ fontSize: 15 }}>{approved} of {named.length} sheets approved</span>
            <button className="btn" disabled={!toDraw.length} onClick={() => toDraw.forEach((c) => void drawSheet(st.id, c.id))}>Draw all sheets</button>
            <button className="btn btn-primary" disabled={heroMissing} onClick={() => nav(`/s/${st.id}/paristhiti`)}>Next: Paristhiti</button>
          </div>
        </div>
      </div>
      <aside className="stack gap-16" style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div className="panel stack gap-10" style={{ padding: 18 }}>
          <h2 className="h2">The four purusharthas</h2>
          {PURUSHARTHAS.map((p) => (
            <div key={p.k} className="row gap-10" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <span style={{ flex: '0 0 auto', width: 36, height: 36, border: '3px solid #141414', borderRadius: 8, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={p.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={p.icon} /></svg>
              </span>
              <span><strong>{p.k}</strong> · {p.hint}</span>
            </div>
          ))}
          <p className="hint m0">Kaam is always written in a child-friendly way: wishes, ambition and love for family and friends.</p>
        </div>
        <div className="panel stack gap-10" style={{ padding: 18, background: '#E6EEFF' }}>
          <h2 className="h2">About your images</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }} className="stack gap-6">
            <li>Images only guide the cartoon sheets and pictures. They never appear in the book or the PDF.</li>
            <li>Photos of children are sometimes declined by the image service. If so, we draw from your description and tell you.</li>
            <li>They're kept in this browser until you delete them.</li>
          </ul>
          <p style={{ margin: 0, fontWeight: 700 }}>Uploaded in this katha: {photoCount}</p>
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={askDeleteImages}>Delete my images</button>
        </div>
      </aside>
    </div>
  );
}
