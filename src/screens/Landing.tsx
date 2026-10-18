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
  const start = () => nav('/library');
  const demo = () => { updateSettings({ demo: true }); nav('/library'); };
  const steps = [
    ['Desh & Kaal', 'Where and when: a forest by the Narmada, a kingdom in the Treta Yuga, a village at Diwali.'],
    ['Paatra', 'The characters, human or animal, and what drives each one: dharma, artha, kaam or moksh.'],
    ['Paristhiti & Katha', 'The situation, the plot and the lesson. Review every page before any picture is drawn.'],
    ['Read & print', 'Single scenes for simple tales, six-panel comic pages for richer ones. Read aloud or print as a PDF.'],
  ];
  return (
    <>
      <header className="appheader" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Bangers', Impact, sans-serif", fontSize: 28, letterSpacing: '.04em' }}>Comic Storybook Maker</span>
        <button className="btn btn-sm" onClick={start}>Open my storybooks</button>
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
              <a className="btn btn-quiet" href="#how" onClick={(e) => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }); }}>How it works</a>
            </div>
          </div>
          <div style={{ flex: '1 1 280px', maxWidth: 360, margin: '0 auto', transform: 'rotate(2deg)', boxShadow: '8px 8px 0 #141414' }}>
            <PagePanel story={sample.st} page={sample.cover} />
          </div>
        </section>
        <section id="how" style={{ maxWidth: 1160, margin: '0 auto', padding: '8px 20px 40px' }}>
          <h2 className="h1" style={{ marginBottom: 20 }}>How a katha comes together</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 24 }}>
            {steps.map(([h, t], i) => (
              <li key={h} className="panel stack gap-8" style={{ padding: 20 }}>
                <span className="h2" style={{ fontSize: 40, color: '#1F4FB8' }}>{i + 1}</span>
                <h3 className="h2">{h}</h3>
                <p className="m0">{t}</p>
              </li>
            ))}
          </ol>
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
