import { useState } from 'react';
import { mockConfig, type MockImageMode } from '../api/mock';
import { updateSettings } from '../state/settings';
import { Chip } from './Shell';

/** Floating demo-mode switches (frontend-spec §7). */
export function MockPanel() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const set = (fn: () => void) => { fn(); force((n) => n + 1); };
  const modes: [MockImageMode, string][] = [['works', 'Always works'], ['realistic', 'Realistic refusals'], ['refused', 'Always refused']];
  return (
    <div className="no-print" style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 65, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', maxWidth: 'calc(100% - 32px)' }}>
      {open && (
        <div className="panel" style={{ width: 320, maxWidth: '100%', maxHeight: '70vh', overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 15 }}>
          <div>
            <h2 className="h2" style={{ fontSize: 22 }}>Demo mode</h2>
            <p className="hint" style={{ margin: '2px 0 0' }}>No keys, no cost. Simulated stories, pictures, delays and refusals.</p>
          </div>
          <fieldset className="fieldset">
            <legend className="label">Image results</legend>
            <div className="row gap-6">
              {modes.map(([m, l]) => <Chip key={m} small pressed={mockConfig.images === m} onClick={() => set(() => { mockConfig.images = m; })}>{l}</Chip>)}
            </div>
          </fieldset>
          <div className="row gap-6">
            <Chip small pressed={mockConfig.storyFails} onClick={() => set(() => { mockConfig.storyFails = !mockConfig.storyFails; })}>Story job fails</Chip>
            <Chip small pressed={mockConfig.speed === 0.25} onClick={() => set(() => { mockConfig.speed = mockConfig.speed === 1 ? 0.25 : 1; })}>Fast timings</Chip>
          </div>
          <button className="linkbtn" style={{ alignSelf: 'flex-start' }} onClick={() => updateSettings({ demo: false })}>Leave demo mode</button>
        </div>
      )}
      <button className="btn btn-sm" style={{ background: '#141414', color: '#FFD93B', boxShadow: '3px 3px 0 #FFD93B' }} aria-expanded={open} onClick={() => setOpen(!open)}>Demo mode</button>
    </div>
  );
}
