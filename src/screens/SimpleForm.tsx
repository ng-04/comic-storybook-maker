// Simple mode: the one-form flow of the first version. "Make my comic!" writes the story and
// starts drawing every page straight away (cover first, then the rest matching the cover).

import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconX } from '../components/Icons';
import { Chip } from '../components/Shell';
import { COUNTS, SIMPLE_TONES } from '../domain/constants';
import { fmtSize } from '../domain/model';
import type { SimpleInput, Story } from '../domain/types';
import { useBlobUrl } from '../hooks/useBlobUrl';
import { askConfirm, removeSimplePhoto, setSimplePhoto, updateSimple } from '../state/store';

export function SimpleForm({ st }: { st: Story }) {
  const nav = useNavigate();
  const fileId = useId();
  const s = st.simple!;
  const set = <K extends keyof SimpleInput>(k: K, v: SimpleInput[K]) => updateSimple(st.id, { [k]: v } as Partial<SimpleInput>);
  const photoUrl = useBlobUrl(s.photo?.blobId);
  const missing = [!s.hero.trim() && "the hero's name", !s.idea.trim() && 'a story idea'].filter(Boolean) as string[];

  const make = () => {
    if (missing.length) return;
    const go = () => nav(`/s/${st.id}/writing?start=1`);
    if (st.pages.length) {
      askConfirm({ title: 'Make a new version?', body: 'The current story and its pictures will be replaced with a new one.', yes: 'Make it again', run: go });
    } else go();
  };

  return (
    <div className="stack gap-24" style={{ maxWidth: 760 }}>
      <div>
        <p className="kicker">Simple comic</p>
        <h1 className="h1">Who's the hero, and what happens?</h1>
        <p className="muted" style={{ margin: '8px 0 0', maxWidth: '62ch' }}>Fill in the basics. Claude writes the story, you check the words, then every page is drawn. You can redraw any page afterwards.</p>
      </div>
      <div className="panel stack gap-20" style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 16 }}>
          <div>
            <label className="label" htmlFor="s-hero">Hero's name</label>
            <input className="input" id="s-hero" value={s.hero} onChange={(e) => set('hero', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="s-age">Hero's age</label>
            <input className="input" id="s-age" inputMode="numeric" value={s.age} onChange={(e) => set('age', e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />
          </div>
        </div>
        <fieldset className="fieldset">
          <legend className="label">Hero is a</legend>
          <div className="row gap-10">
            {([['boy', 'Boy'], ['girl', 'Girl'], ['child', 'Keep neutral']] as const).map(([v, l]) => <Chip key={v} pressed={s.gender === v} onClick={() => set('gender', v)}>{l}</Chip>)}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="s-others">Other characters</label>
          <input className="input" id="s-others" value={s.others} placeholder="e.g. baby brother Rudrav, Mama, Papa" onChange={(e) => set('others', e.target.value)} />
          <p className="hint">Separate them with commas.</p>
        </div>
        <div>
          <label className="label" htmlFor="s-idea">Story idea</label>
          <textarea className="input" id="s-idea" rows={4} value={s.idea} onChange={(e) => set('idea', e.target.value)} />
        </div>
        <fieldset className="fieldset">
          <legend className="label">Tone</legend>
          <div className="row gap-8">{SIMPLE_TONES.map((t) => <Chip key={t} small pressed={s.tone === t} onClick={() => set('tone', t)}>{t}</Chip>)}</div>
        </fieldset>
        <fieldset className="fieldset">
          <legend className="label">Pages (with cover and ending)</legend>
          <div className="row gap-8">{COUNTS.map((n) => <Chip key={n} small pressed={s.pages === n} onClick={() => set('pages', n)}>{n} pages</Chip>)}</div>
        </fieldset>
        <div className="stack gap-8">
          <span className="label" style={{ margin: 0 }}>Family photo <span className="muted" style={{ fontWeight: 400 }}>(optional: guides how the characters look)</span></span>
          <div className="row gap-14">
            {s.photo && photoUrl && <img src={photoUrl} alt="Selected family photo" style={{ width: 72, height: 72, objectFit: 'cover', border: '3px solid #141414', borderRadius: 6 }} />}
            {s.photo && (
              <span className="reftile">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{s.photo.name}</span>
                <span className="muted" style={{ fontSize: 13 }}>{fmtSize(s.photo.size)}</span>
                <button className="btn btn-sm" style={{ minHeight: 36, width: 36, padding: 0, boxShadow: 'none' }} aria-label="Remove photo" onClick={() => void removeSimplePhoto(st.id)}><IconX size={14} /></button>
              </span>
            )}
            <input className="sr-only file-in" id={fileId} type="file" accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void setSimplePhoto(st.id, f); }} />
            <label className="btn btn-sm" htmlFor={fileId}>{s.photo ? 'Change photo' : 'Choose photo'}</label>
          </div>
          <p className="hint m0">Photos of children are sometimes declined by the image service. If so, pages are drawn to match the cover instead, and you'll see a note.</p>
        </div>
      </div>
      {missing.length > 0 && <div className="note note-warn" role="status"><span><strong>Before making it:</strong> add {missing.join(' and ')}.</span></div>}
      <div className="row gap-12 between">
        <button className="btn" onClick={() => nav('/library')}>Back</button>
        <button className="btn btn-primary btn-lg" disabled={missing.length > 0} onClick={make}>{st.pages.length ? 'Make it again' : 'Make my comic!'}</button>
      </div>
    </div>
  );
}
