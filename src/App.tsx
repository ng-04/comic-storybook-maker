import { useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog, Toasts } from './components/Dialogs';
import { AppShell } from './components/Shell';
import { StepBar, type StepKey } from './components/StepBar';
import { isConfigured, useSettings } from './state/settings';
import { loadLibrary, storyById, useStore } from './state/store';
import type { Story } from './domain/types';
import { Illustrate } from './screens/Illustrate';
import { Landing } from './screens/Landing';
import { Library } from './screens/Library';
import { Outline } from './screens/Outline';
import { PageEditor } from './screens/PageEditor';
import { Reader } from './screens/Reader';
import { Settings } from './screens/Settings';
import { Unlock } from './screens/Unlock';
import { loadBundle } from './state/vault';
import { Writing } from './screens/Writing';
import { Katha } from './screens/setup/Katha';
import { Paatra } from './screens/setup/Paatra';
import { Desh, Kaal, Paristhiti } from './screens/setup/SetupSteps';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/** Whether the site publishes passkey-protected keys (null while checking). */
function useHasBundle(): boolean | null {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => { void loadBundle().then((b) => setHas(!!b)); }, []);
  return has;
}

/** On page load, ask for the passkey when the site has shared keys and this browser has none. */
function PasskeyGate() {
  const s = useSettings();
  const has = useHasBundle();
  const nav = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (has && !isConfigured(s) && pathname !== '/unlock' && pathname !== '/settings') nav('/unlock', { replace: true });
    // Only on load: after that, people can still reach Settings or the demo from the Unlock screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [has]);
  return null;
}

function RequireSetup({ children }: { children: ReactNode }) {
  const s = useSettings();
  const has = useHasBundle();
  if (isConfigured(s)) return <>{children}</>;
  if (has === null) return <main className="wrap"><p role="status">Loading…</p></main>;
  return <Navigate to={has ? '/unlock' : '/settings?first=1'} replace />;
}

const SCREENS: Record<string, { step: StepKey; render: (st: Story) => ReactNode }> = {
  desh: { step: 'desh', render: (st) => <Desh st={st} /> },
  kaal: { step: 'kaal', render: (st) => <Kaal st={st} /> },
  paatra: { step: 'paatra', render: (st) => <Paatra st={st} /> },
  paristhiti: { step: 'paristhiti', render: (st) => <Paristhiti st={st} /> },
  katha: { step: 'katha', render: (st) => <Katha st={st} /> },
  writing: { step: 'katha', render: (st) => <Writing st={st} /> },
  outline: { step: 'outline', render: (st) => <Outline st={st} /> },
  pictures: { step: 'pictures', render: (st) => <Illustrate st={st} /> },
  pages: { step: 'pictures', render: (st) => <PageEditor st={st} /> },
  read: { step: 'read', render: (st) => <Reader st={st} /> },
};

function StoryRoute({ screen }: { screen: string }) {
  const { storyId } = useParams();
  const { loaded } = useStore();
  const st = storyById(storyId);
  if (!loaded) return <main className="wrap"><p role="status">Loading…</p></main>;
  if (!st) {
    return (
      <main className="wrap">
        <div className="panel stack gap-12" style={{ padding: 28, alignItems: 'flex-start', maxWidth: 560 }}>
          <h1 className="h1">We can't find that storybook</h1>
          <p className="m0">It may have been deleted, or it was made in a different browser. Storybooks are saved in the browser that made them.</p>
          <a className="btn btn-primary" href="#/library">My storybooks</a>
        </div>
      </main>
    );
  }
  const def = SCREENS[screen];
  return (
    <>
      <StepBar story={st} current={def.step} />
      <main className="wrap">{def.render(st)}</main>
    </>
  );
}

const inShell = (node: ReactNode) => <RequireSetup><AppShell>{node}</AppShell></RequireSetup>;

export default function App() {
  useEffect(() => { void loadLibrary(); }, []);
  return (
    <HashRouter>
      <ScrollTop />
      <PasskeyGate />
      <div className="app">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="/settings" element={<AppShell><Settings /></AppShell>} />
          <Route path="/library" element={inShell(<Library />)} />
          {Object.keys(SCREENS).filter((k) => k !== 'pages').map((k) => (
            <Route key={k} path={`/s/:storyId/${k}`} element={inShell(<StoryRoute screen={k} />)} />
          ))}
          <Route path="/s/:storyId/pages/:pageId" element={inShell(<StoryRoute screen="pages" />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toasts />
        <ConfirmDialog />
      </div>
    </HashRouter>
  );
}
