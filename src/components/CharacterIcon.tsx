import type { Character } from '../domain/types';

/** Gender/form thumbnail from the prototype: bust for humans (bun for female), animal, bird, halo for divine. */
export function CharacterIcon({ c, size = 52 }: { c: Pick<Character, 'gender' | 'form' | 'color'>; size?: number }) {
  const human = c.form === 'Human' || c.form === 'Divine being';
  const female = c.gender === 'female';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: '0 0 auto' }}>
      <circle cx="32" cy="32" r="30" fill="#FFFDF8" stroke="#141414" strokeWidth="3" />
      {c.form === 'Divine being' && <circle cx="32" cy="26" r="17" fill="none" stroke="#FFD93B" strokeWidth="4" />}
      {human && (
        <g>
          <path d="M11 60c2-11 10-16 21-16s19 5 21 16z" fill={c.color} stroke="#141414" strokeWidth="3" />
          {female && <circle cx="32" cy="12" r="5.5" fill="#141414" />}
          <circle cx="32" cy="27" r="11" fill="#F2CFAE" stroke="#141414" strokeWidth="3" />
          <path d="M21 26c0-8 5-12 11-12s11 4 11 12c-3-4-7-5-11-5s-8 1-11 5z" fill="#141414" />
          {female && <path d="M20 27c-1 6 0 12 3 16" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />}
          {female && <circle cx="32" cy="24" r="1.7" fill="#FF4A3D" />}
        </g>
      )}
      {c.form === 'Animal' && (
        <g>
          <path d="M17 24l4-12 9 8z M47 24l-4-12-9 8z" fill={c.color} stroke="#141414" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="32" cy="34" r="16" fill={c.color} stroke="#141414" strokeWidth="3" />
          <ellipse cx="32" cy="41" rx="7" ry="5" fill="#F2CFAE" stroke="#141414" strokeWidth="2.5" />
          <circle cx="26" cy="31" r="2.2" fill="#141414" /><circle cx="38" cy="31" r="2.2" fill="#141414" />
        </g>
      )}
      {c.form === 'Bird' && (
        <g>
          <path d="M28 18l4-9 4 9" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="33" r="15" fill={c.color} stroke="#141414" strokeWidth="3" />
          <path d="M43 30l13 4-13 4z" fill="#FFD93B" stroke="#141414" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="34" cy="30" r="2.4" fill="#141414" />
        </g>
      )}
    </svg>
  );
}

export function GenderToggleIcon({ female }: { female: boolean }) {
  return (
    <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill={female ? '#FFE7E3' : '#E6EEFF'} stroke="#141414" strokeWidth="3" />
      <path d="M11 60c2-11 10-16 21-16s19 5 21 16z" fill={female ? '#FF4A3D' : '#1F4FB8'} stroke="#141414" strokeWidth="3" />
      {female && <circle cx="32" cy="12" r="5.5" fill="#141414" />}
      <circle cx="32" cy="27" r="11" fill="#F2CFAE" stroke="#141414" strokeWidth="3" />
      <path d="M21 26c0-8 5-12 11-12s11 4 11 12c-3-4-7-5-11-5s-8 1-11 5z" fill="#141414" />
      {female && <path d="M20 27c-1 6 0 12 3 16" fill="none" stroke="#141414" strokeWidth="3" strokeLinecap="round" />}
      {female && <circle cx="32" cy="24" r="1.7" fill="#FF4A3D" />}
    </svg>
  );
}
