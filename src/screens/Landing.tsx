import { useNavigate } from 'react-router-dom';
import { IconShield } from '../components/Icons';
import { PagePanel } from '../components/PagePanel';
import { newCharacter, newPage, newStory } from '../domain/model';
import { updateSettings } from '../state/settings';

// A sample cover for the hero: a real PagePanel with no picture drawn, so it shows the layout.
const sample = (() => {
  const st = newStory();
  st.title = 'Chiku and the River Promise';
  st.characters = [newCharacter('nayak', 3, { name: 'Chiku' }), newCharacter('mitra', 2, { name: 'Neela' }), newCharacter('guru', 5, { name: 'Kurma Dada' })];
  return { st, cover: newPage('cover', { caption: st.title, status: 'none' }) };
})();

export function Landing() {
  const nav = useNavigate();
  // /library redirects to Unlock (site has shared keys) or Settings (it doesn't) when no keys are set.
  const start = () => nav('/new');
  const demo = () => { updateSettings({ demo: true }); nav('/library'); };
  return (
    <>
      <header className="appheader" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Bangers', Impact, sans-serif", fontSize: 28, letterSpacing: '.04em' }}>Comic Storybook Maker</span>
        <button className="btn btn-sm" onClick={() => nav('/library')}>Open my storybooks</button>
      </header>
      <main>
        <section style={{ maxWidth: 1160, margin: '0 auto', padding: '48px 20px 40px', display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center' }}>
          <div className="stack gap-20" style={{ flex: '999 1 420px', minWidth: 0 }}>
            <p className="kicker">Panchatantra · Jataka · Itihasa</p>
            <h1 className="display" style={{ fontSize: 'clamp(52px, 9vw, 92px)' }}>Comic books with a lesson at heart</h1>
            <p style={{ margin: 0, fontSize: 21, maxWidth: '40ch' }}>Build a katha the way the old storytellers did: choose the desh and kaal, bring in your paatra, set the paristhiti, and turn it into a comic your children can read, print and remember.</p>
            <div className="row gap-14">
              <button className="btn btn-primary btn-lg" onClick={start}>Start a katha</button>
              <button className="btn" onClick={demo}>Try the demo (no keys)</button>
            </div>
          </div>
          <div style={{ flex: '1 1 280px', maxWidth: 360, margin: '0 auto', transform: 'rotate(2deg)', boxShadow: '8px 8px 0 #141414' }}>
            <PagePanel story={sample.st} page={sample.cover} />
          </div>
        </section>
        <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 20px 64px' }}>
          <div className="panel row gap-16" style={{ padding: 20, background: '#E6EEFF' }}>
            <IconShield />
            <p style={{ margin: 0, flex: '1 1 300px' }}>
              Your storybooks, photos and API keys stay in this browser. Photos are only sent to the image service to guide the drawings, and you can delete them at any time.
              You bring your own Anthropic and Google Gemini API keys; each book costs a little on your own accounts.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
