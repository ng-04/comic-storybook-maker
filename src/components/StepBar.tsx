import { useNavigate } from 'react-router-dom';
import type { Story } from '../domain/types';

export type StepKey = 'simple' | 'check' | 'desh' | 'kaal' | 'paatra' | 'paristhiti' | 'katha' | 'outline' | 'pictures' | 'read';

/** 1 Desh · 2 Kaal · 3 Paatra · 4 Paristhiti · 5 Story Plot and Lesson · 6 Outline · 7 Pictures · 8 Read (frontend-spec §2). */
export function StepBar({ story, current }: { story: Story; current: StepKey }) {
  const nav = useNavigate();
  const anyDrawn = story.pages.some((p) => p.versions.length);
  const steps: [StepKey, string, boolean][] = story.mode === 'simple' ? [
    ['simple', 'Story', true],
    ['check', 'Check', story.pages.length > 0],
    ['pictures', 'Pictures', story.status === 'illustrating' || story.status === 'done' || anyDrawn],
    ['read', 'Read', anyDrawn],
  ] : [
    ['desh', 'Desh', true], ['kaal', 'Kaal', true], ['paatra', 'Paatra', true], ['paristhiti', 'Paristhiti', true], ['katha', 'Story Plot and Lesson', true],
    ['outline', 'Outline', story.pages.length > 0],
    ['pictures', 'Pictures', story.status === 'illustrating' || story.status === 'done' || anyDrawn],
    ['read', 'Read', anyDrawn],
  ];
  return (
    <div className="stepbar no-print">
      <div>
        <p style={{ margin: 0, fontWeight: 700, flex: '1 1 200px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.title}</p>
        <nav aria-label="Storybook steps">
          <ol>
            {steps.map(([key, label, open], i) => (
              <li key={key}>
                <button
                  type="button" className="chip chip-sm" aria-pressed={key === current} aria-current={key === current ? 'step' : undefined}
                  disabled={!open} style={{ opacity: open ? 1 : 0.45 }}
                  onClick={() => nav(`/s/${story.id}/${key}`)}
                >
                  <span style={{ fontFamily: "'Bangers', Impact, sans-serif", fontSize: 16 }}>{i + 1}</span>{label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}
