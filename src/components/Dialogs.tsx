import { useEffect, useRef, type ReactNode } from 'react';
import { closeConfirm, dismissToast, useStore } from '../state/store';

/** Modal with Esc to close, focus moved in on open and restored on close, Tab kept inside. */
export function Dialog({ labelledBy, onClose, children, alert, maxWidth = 460 }: {
  labelledBy: string; onClose: () => void; children: ReactNode; alert?: boolean; maxWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, [href], input, select, textarea');
    first?.focus();
    return () => before?.focus?.();
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !ref.current) return;
    const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea'));
    if (!f.length) return;
    const i = f.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };
  return (
    <div className="overlay no-print" onKeyDown={onKey} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="panel dialog" role={alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={labelledBy} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog() {
  const { confirm } = useStore();
  if (!confirm) return null;
  return (
    <Dialog labelledBy="cf-title" onClose={closeConfirm} alert maxWidth={440}>
      <h2 className="h2" id="cf-title" style={{ fontSize: 30 }}>{confirm.title}</h2>
      <p className="m0">{confirm.body}</p>
      <div className="row gap-10 end">
        <button className="btn" onClick={closeConfirm}>Keep it</button>
        <button className="btn btn-red" onClick={() => { closeConfirm(); confirm.run(); }}>{confirm.yes}</button>
      </div>
    </Dialog>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts no-print" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'warn' ? 't-warn' : ''}`}>
          <span style={{ flex: '1 1 auto' }}>{t.text}</span>
          {t.action && <button className="linkbtn" onClick={() => { t.action!.run(); dismissToast(t.id); }}>{t.action.label}</button>}
          <button className="linkbtn" style={{ textDecoration: 'none', fontSize: 20, lineHeight: 1 }} aria-label="Dismiss" onClick={() => dismissToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
