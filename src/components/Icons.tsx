// Small stroke icons from the prototype. All are decorative (aria-hidden); buttons carry labels.

import type { ReactNode } from 'react';

interface P { size?: number; color?: string; width?: number }

function Svg({ size = 18, color = '#141414', width = 3.2, children }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: '0 0 auto' }}>
      {children}
    </svg>
  );
}

export const IconX = (p: P) => <Svg width={3.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconUp = (p: P) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
export const IconDown = (p: P) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>;
export const IconPrev = (p: P) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const IconNext = (p: P) => <Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>;
export const IconCheck = (p: P) => <Svg width={4} {...p}><path d="M5 12l5 5 9-10" /></Svg>;
export const IconInfo = (p: P) => <Svg width={2.6} size={22} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></Svg>;
export const IconImage = (p: P) => <Svg width={2.4} size={20} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 17l-5-5-8 7" /></Svg>;
export const IconShield = (p: P) => <Svg width={2.4} size={40} {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></Svg>;
export const IconOffline = (p: P) => <Svg width={2.6} size={22} color="#FFD93B" {...p}><path d="M2 8.5a15 15 0 0 1 20 0" /><path d="M5.5 12a10 10 0 0 1 13 0" /><path d="M9 15.5a5 5 0 0 1 6 0" /><path d="M3 3l18 18" /></Svg>;
export const IconPdf = (p: P) => <Svg width={2.4} size={28} {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M12 12v6M9 15l3 3 3-3" /></Svg>;
export const IconKey = (p: P) => <Svg width={2.4} size={22} {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M15 8l2 2" /></Svg>;

export const Spinner = ({ small }: { small?: boolean }) => (
  <span className="spin" aria-hidden="true" style={small ? { width: 16, height: 16, borderWidth: 3 } : undefined} />
);
