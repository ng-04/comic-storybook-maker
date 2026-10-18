import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { testAnthropicKey } from '../api/claude';
import { testGeminiKey } from '../api/gemini';
import { asApiError } from '../api/types';
import { askDeleteImages } from '../components/Shell';
import { Spinner } from '../components/Icons';
import { forgetKeys, isConfigured, STORY_MODELS, updateSettings, useSettings, type Settings as S } from '../state/settings';
import { askConfirm } from '../state/store';
import { encryptKeys, passkeyProblem } from '../state/vault';

type TestState = { status: 'idle' | 'busy' | 'ok' | 'bad'; text: string };

function KeyField({ id, label, field, placeholder, help, onTest }: {
  id: string; label: string; field: 'anthropicKey' | 'geminiKey'; placeholder: string; help: React.ReactNode; onTest: () => Promise<string>;
}) {
  const s = useSettings();
  const [shown, setShown] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle', text: '' });
  const run = async () => {
    setTest({ status: 'busy', text: 'Testing…' });
    try { setTest({ status: 'ok', text: `✓ ${await onTest()}` }); }
    catch (e) { setTest({ status: 'bad', text: `✗ ${asApiError(e).message}` }); }
  };
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="keyrow">
        <input
          className="input mono" id={id} type={shown ? 'text' : 'password'} autoComplete="off" spellCheck={false}
          value={s[field]} placeholder={placeholder}
          onChange={(e) => { updateSettings({ [field]: e.target.value.trim() } as Partial<S>); setTest({ status: 'idle', text: '' }); }}
        />
        <button type="button" className="btn btn-sm" aria-pressed={shown} onClick={() => setShown(!shown)}>{shown ? 'Hide' : 'Show'}</button>
        <button type="button" className="btn btn-sm btn-blue" onClick={run} disabled={test.status === 'busy' || !s[field]}>
          {test.status === 'busy' && <Spinner small />}Test key
        </button>
      </div>
      {test.text && <p className={test.status === 'ok' ? 'ok-text' : test.status === 'bad' ? 'err' : 'hint'} role="status">{test.text}</p>}
      <p className="hint">{help}</p>
    </div>
  );
}

/** Owner tool: encrypt the keys in this browser with a passkey and download keys.enc.json. */
function SharePasskey() {
  const s = useSettings();
  const [pk, setPk] = useState('');
  const [pk2, setPk2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const hasKeys = !!s.anthropicKey && !!s.geminiKey;
  const problem = pk ? passkeyProblem(pk) : null;
  const mismatch = !!pk2 && pk.trim() !== pk2.trim();
  const create = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const bundle = await encryptKeys({ anthropicKey: s.anthropicKey, workspaceId: s.workspaceId, geminiKey: s.geminiKey }, pk);
      const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'keys.enc.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ ok: true, text: 'Downloaded keys.enc.json. Put it in the project\'s public/ folder and push; visitors will then be asked for the passkey.' });
      setPk('');
      setPk2('');
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't create the file." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel stack gap-14" style={{ padding: 20, background: '#FFFDF8' }}>
      <h2 className="h2">Share your keys with a passkey</h2>
      <p className="m0">
        Creates <span className="mono">keys.enc.json</span>: the keys above, encrypted with a passkey. Publish that file with the site and anyone who knows
        the passkey can unlock the keys on page load. The file is public, so only the passkey protects your keys: make it long and unusual, share it privately,
        and set spend limits on both accounts. To change the passkey or keys, create a new file and replace the old one.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 14 }}>
        <div>
          <label className="label" htmlFor="pk1">Passkey</label>
          <input className="input" id="pk1" type="password" autoComplete="new-password" value={pk} onChange={(e) => setPk(e.target.value)} />
          {problem && <p className="err">{problem}</p>}
        </div>
        <div>
          <label className="label" htmlFor="pk2">Passkey again</label>
          <input className="input" id="pk2" type="password" autoComplete="new-password" value={pk2} onChange={(e) => setPk2(e.target.value)} />
          {mismatch && <p className="err">The two passkeys don't match.</p>}
        </div>
      </div>
      {!hasKeys && <p className="hint m0">Add both API keys above first.</p>}
      <button className="btn btn-blue" style={{ alignSelf: 'flex-start' }} disabled={!hasKeys || !pk || !!problem || pk.trim() !== pk2.trim() || busy} onClick={() => void create()}>
        {busy && <Spinner small />}Create keys.enc.json
      </button>
      {msg && <p className={msg.ok ? 'ok-text' : 'err'} role="status">{msg.text}</p>}
    </section>
  );
}

export function Settings() {
  const s = useSettings();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const first = params.get('first') === '1';
  return (
    <main className="wrap">
      <div className="narrow">
        <div>
          <p className="kicker">Settings</p>
          <h1 className="h1">Your API keys</h1>
          <p className="muted" style={{ margin: '8px 0 0', maxWidth: '64ch' }}>
            Claude writes the story and Gemini draws the pictures, using your own keys. They're saved only in this browser and sent only to Anthropic and Google.
            Don't use this on a shared computer, and set a monthly spend limit on both accounts.
          </p>
        </div>
        {first && !isConfigured(s) && (
          <div className="note note-warn" role="status"><span><strong>Add both keys to start,</strong> or try the demo first: it needs no keys and costs nothing.</span></div>
        )}

        <section className="panel stack gap-20" style={{ padding: 20 }}>
          <KeyField
            id="anthropic-key" label="Anthropic API key (writes the story)" field="anthropicKey" placeholder="sk-ant-..." onTest={testAnthropicKey}
            help={<>Create one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a> under Settings → API Keys, after adding some credit. Test sends a one-line message (a fraction of a cent).</>}
          />
          <div>
            <label className="label" htmlFor="workspace">Anthropic workspace ID <span className="muted" style={{ fontWeight: 400 }}>(only if your key isn't scoped to a workspace)</span></label>
            <input className="input mono" id="workspace" autoComplete="off" spellCheck={false} placeholder="wrkspc_... (optional)" value={s.workspaceId} onChange={(e) => updateSettings({ workspaceId: e.target.value.trim() })} />
          </div>
          <div>
            <label className="label" htmlFor="story-model">Story model</label>
            <select className="input" id="story-model" value={s.storyModel} onChange={(e) => updateSettings({ storyModel: e.target.value })}>
              {STORY_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </section>

        <section className="panel stack gap-20" style={{ padding: 20 }}>
          <KeyField
            id="gemini-key" label="Gemini API key (draws the pictures)" field="geminiKey" placeholder="Paste key from Google AI Studio" onTest={testGeminiKey}
            help={<>Create one at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com</a> → Get API key. Image generation needs billing enabled on the Google project. Test is free.</>}
          />
        </section>

        <SharePasskey />

        <section className="panel stack gap-12" style={{ padding: 20, background: '#FFFDF8' }}>
          <h2 className="h2">Demo mode</h2>
          <p className="m0">Try every screen with simulated stories and placeholder pictures. No keys, no cost.</p>
          <label className="row gap-10" style={{ fontWeight: 700, minHeight: 44, cursor: 'pointer' }}>
            <input type="checkbox" style={{ width: 22, height: 22, accentColor: '#1F4FB8' }} checked={s.demo} onChange={(e) => updateSettings({ demo: e.target.checked })} />
            Use demo mode
          </label>
        </section>

        <section className="panel stack gap-12" style={{ padding: 20, background: '#E6EEFF' }}>
          <h2 className="h2">Your data</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }} className="stack gap-6">
            <li>Storybooks and pictures are saved in this browser only. Clearing site data deletes them; export a PDF to keep a copy.</li>
            <li>Reference photos are sent to Google only to guide drawings. They never appear in the book or the PDF.</li>
          </ul>
          <div className="row gap-10">
            <button className="btn btn-sm" onClick={askDeleteImages}>Delete my images</button>
            <button className="btn btn-sm" disabled={!s.anthropicKey && !s.geminiKey} onClick={() => askConfirm({
              title: 'Forget the API keys here?',
              body: s.fromPasskey ? 'The keys are removed from this browser. You can unlock them again with the passkey.' : 'The keys are removed from this browser. Keep a copy if you want to add them again.',
              yes: 'Forget keys',
              run: forgetKeys,
            })}>Forget keys on this browser</button>
          </div>
          {s.fromPasskey && <p className="hint m0">These keys were unlocked with the site's passkey.</p>}
        </section>

        <div className="row gap-12 end">
          <button className="btn btn-primary btn-lg" onClick={() => nav('/library')} disabled={!isConfigured(s)}>Go to my storybooks</button>
        </div>
      </div>
    </main>
  );
}
