import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { updateSettings, useSettings } from '../state/settings';
import { askConfirm, deleteAllReferenceImages, useStore } from '../state/store';
import { IconOffline } from './Icons';
import { MockPanel } from './MockPanel';

export function Chip({ pressed, onClick, children, small, disabled, style }: {
  pressed?: boolean; onClick: () => void; children: ReactNode; small?: boolean; disabled?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button type="button" className={`chip ${small ? 'chip-sm' : ''}`} aria-pressed={pressed === undefined ? undefined : pressed} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

export function askDeleteImages() {
  askConfirm({
    title: 'Delete all your images?',
    body: 'Every reference image you uploaded, in every storybook, will be deleted from this browser. Approved cartoon sheets and drawn pages stay.',
    yes: 'Delete images',
    run: () => void deleteAllReferenceImages(),
  });
}

function SaveStatus() {
  const { saveState, online } = useStore();
  const label = saveState === 'saving' ? 'Saving…' : saveState === 'error' ? "Couldn't save" : online ? 'Saved on this device' : 'Saved on this device · offline';
  const bg = saveState === 'error' ? '#FFD3CE' : saveState === 'saving' ? '#FFFFFF' : '#FFF4C2';
  return (
    <span className="badge" role="status" style={{ background: bg }}>
      {saveState === 'saving' && <span className="dot pulse" aria-hidden="true" />}
      {label}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { online } = useStore();
  const settings = useSettings();
  const nav = useNavigate();
  return (
    <>
      <header className="appheader no-print">
        <button className="tile wordmark" onClick={() => nav('/library')}>Comic Storybook Maker</button>
        <nav aria-label="Main" className="row gap-8 grow">
          <NavLink to="/library" className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : ''}`}>My storybooks</NavLink>
        </nav>
        <SaveStatus />
        <Link to="/settings" className="btn btn-sm">Settings</Link>
      </header>
      {settings.demo && (
        <div className="no-print row gap-12" role="status" style={{ background: '#FFF4C2', borderBottom: '4px solid #141414', padding: '10px 20px', fontWeight: 700 }}>
          <span className="badge" style={{ background: '#141414', color: '#FFD93B' }}>Demo mode</span>
          <span className="grow">Stories and pictures are simulated placeholders. Nothing is sent to Claude or Gemini.</span>
          <button className="btn btn-sm btn-primary" onClick={() => { updateSettings({ demo: false }); nav('/library'); }}>Use real AI</button>
        </div>
      )}
      {!online && (
        <div className="offline no-print" role="status">
          <IconOffline />
          You're offline. Your edits are kept on this device. Drawing is paused and will resume when you're back.
        </div>
      )}
      {children}
      {settings.demo && <MockPanel />}
    </>
  );
}
