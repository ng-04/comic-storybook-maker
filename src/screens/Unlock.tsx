// Shown on load when the site publishes passkey-protected keys and this browser has none yet.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/Icons';
import { updateSettings } from '../state/settings';
import { decryptKeys, loadBundle } from '../state/vault';

export function Unlock() {
  const nav = useNavigate();
  const [passkey, setPasskey] = useState('');
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkey.trim()) { setError('Enter the passkey.'); return; }
    setBusy(true);
    setError('');
    try {
      const bundle = await loadBundle();
      if (!bundle) { setError('This site has no shared keys any more. Add your own keys in Settings.'); return; }
      const keys = await decryptKeys(bundle, passkey);
      updateSettings({ ...keys, demo: false, fromPasskey: true });
      nav('/library', { replace: true });
    } catch (err) {
      setError(err instanceof Error && err.message === 'WRONG_PASSKEY' ? "That passkey didn't work. Check it and try again." : "Couldn't unlock the keys in this browser.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <form className="panel stack gap-18" style={{ width: '100%', maxWidth: 460, padding: 28 }} onSubmit={unlock}>
        <p className="kicker">Comic Storybook Maker</p>
        <h1 className="display" style={{ fontSize: 48 }}>Enter the passkey</h1>
        <p className="m0">The passkey unlocks the shared API keys in this browser, so you can write and draw books straight away.</p>
        <div>
          <label className="label" htmlFor="passkey">Passkey</label>
          <div className="keyrow">
            <input className="input" id="passkey" type={shown ? 'text' : 'password'} autoComplete="current-password" autoFocus value={passkey}
              onChange={(e) => { setPasskey(e.target.value); setError(''); }} />
            <button type="button" className="btn btn-sm" aria-pressed={shown} onClick={() => setShown(!shown)}>{shown ? 'Hide' : 'Show'}</button>
          </div>
          {error && <p className="err" role="alert">{error}</p>}
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy && <Spinner small />}{busy ? 'Unlocking…' : 'Unlock'}</button>
        <div className="row gap-8 between">
          <button type="button" className="linkbtn" onClick={() => nav('/settings')}>I have my own keys</button>
          <button type="button" className="linkbtn" onClick={() => { updateSettings({ demo: true }); nav('/library'); }}>Try the demo (no keys)</button>
        </div>
      </form>
    </main>
  );
}
