// One page component everywhere (frontend-spec §5): library covers, thumbnails, the editor,
// the reader and the PDF. Sizes use container-query units (cqw) so the same markup scales.
// All text is HTML laid over the art; images never contain text.

import type { CSSProperties } from 'react';
import { useBlobUrl } from '../hooks/useBlobUrl';
import { activeVersion, starringLine } from '../domain/model';
import type { Page, PageVersion, Story } from '../domain/types';

const BANGERS = "'Bangers', Impact, 'Arial Black', sans-serif";
const ink = '#141414';

type Status = 'none' | 'queued' | 'drawing' | 'done' | 'failed';

function statusOf(p: Page, v: PageVersion | undefined, forced: boolean): Status {
  if (forced) return 'done';
  if (p.status === 'drawing') return 'drawing';
  if (p.status === 'queued') return 'queued';
  if (v) return 'done';
  if (p.status === 'failed') return 'failed';
  return 'none';
}

function Overlay({ status, grid }: { status: Status; grid?: boolean }) {
  const base: CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4cqw' };
  if (grid) {
    const bg = status === 'drawing' ? 'repeating-linear-gradient(45deg, #FFD93B 0 3cqw, #FFF3B8 3cqw 6cqw)'
      : status === 'failed' ? 'repeating-linear-gradient(-45deg, #FFE1DC 0 3cqw, #FFFFFF 3cqw 6cqw)'
        : 'radial-gradient(rgba(20,20,20,.18) 1.2px, #F3EEE4 1.7px)';
    return <div style={{ position: 'absolute', inset: 0, background: bg, backgroundSize: status === 'none' || status === 'queued' ? '3.4cqw 3.4cqw' : undefined }} />;
  }
  if (status === 'queued') {
    return <div style={{ ...base, backgroundColor: '#F3EEE4', backgroundImage: 'radial-gradient(rgba(20,20,20,.18) 1.2px, transparent 1.7px)', backgroundSize: '3.4cqw 3.4cqw', fontFamily: BANGERS, fontSize: '6.5cqw', letterSpacing: '.04em' }}>Waiting its turn</div>;
  }
  if (status === 'drawing') {
    return (
      <div style={{ ...base, background: 'repeating-linear-gradient(45deg, #FFD93B 0 3cqw, #FFF3B8 3cqw 6cqw)', fontFamily: BANGERS, fontSize: '7.5cqw', letterSpacing: '.04em' }}>
        <span style={{ background: '#FFFFFF', border: `max(2px, 0.9cqw) solid ${ink}`, padding: '1.5cqw 3.5cqw' }}>Drawing…</span>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div style={{ ...base, flexDirection: 'column', gap: '2cqw', padding: '5cqw', background: 'repeating-linear-gradient(-45deg, #FFE1DC 0 3cqw, #FFFFFF 3cqw 6cqw)' }}>
        <span style={{ fontFamily: BANGERS, fontSize: '7cqw', letterSpacing: '.04em' }}>Couldn't draw this page</span>
        <span style={{ fontWeight: 700, fontSize: '3.8cqw' }}>Edit the prompt and redraw</span>
      </div>
    );
  }
  if (status === 'none') {
    return <div style={{ ...base, background: '#FFFDF8', fontWeight: 700, fontSize: '4.2cqw', color: '#4A4A4A' }}>Picture not drawn yet</div>;
  }
  return null;
}

function Art({ blobId, alt }: { blobId: string; alt: string }) {
  const url = useBlobUrl(blobId);
  return url ? <img src={url} alt={alt} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} /> : null;
}

const captionStyle: CSSProperties = {
  margin: 0, background: '#FFD93B', border: `max(2px, 0.9cqw) solid ${ink}`, padding: '2.4cqw 3cqw',
  fontWeight: 700, fontSize: '4.2cqw', lineHeight: 1.3, textWrap: 'pretty', boxShadow: `1cqw 1cqw 0 ${ink}`,
} as CSSProperties;

export interface PagePanelProps {
  story: Story;
  page: Page;
  pageNo?: number;
  /** Show this version instead of the active one (version strip). */
  version?: PageVersion;
  /** A fixed picture (the home page's sample cover), shown instead of a drawn version. */
  artSrc?: string;
}

export function PagePanel({ story, page: p, pageNo, version, artSrc }: PagePanelProps) {
  const v = version || activeVersion(p);
  const status = artSrc ? 'done' : statusOf(p, v, !!version);
  const done = status === 'done';
  const isMiddle = p.kind === 'middle';
  const isGrid = isMiddle && p.layout === 'grid';
  const bg = p.kind === 'cover' ? '#1F4FB8' : p.kind === 'end' ? '#FF4A3D' : '#FFFDF8';
  const starring = starringLine(story.characters);

  // cqw units resolve against the nearest *ancestor* container, so the container is an outer wrapper.
  return (
    <div style={{ containerType: 'inline-size', width: '100%' } as CSSProperties}>
    <div style={{
      width: '100%', aspectRatio: '210 / 297', boxSizing: 'border-box',
      border: `max(2px, 1.2cqw) solid ${ink}`, backgroundColor: bg,
      backgroundImage: isMiddle ? 'none' : 'radial-gradient(rgba(20,20,20,.28) 1.2px, transparent 1.8px)', backgroundSize: '3.4cqw 3.4cqw',
      position: 'relative', overflow: 'hidden', fontFamily: "'Comic Neue', 'Comic Sans MS', sans-serif", color: ink,
      display: 'flex', flexDirection: 'column', padding: '4cqw', gap: '3cqw',
    } as CSSProperties}>
      {p.kind === 'cover' && (
        <h2 style={{ margin: 0, fontFamily: BANGERS, fontWeight: 400, fontSize: '11cqw', lineHeight: 0.95, letterSpacing: '.02em', color: '#FFD93B', WebkitTextStroke: `0.55cqw ${ink}`, paintOrder: 'stroke fill', textShadow: `1.1cqw 1.1cqw 0 ${ink}`, textAlign: 'center', textWrap: 'balance' } as CSSProperties}>
          {story.title}
        </h2>
      )}

      {isGrid ? (
        <>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'repeat(3, minmax(0, 1fr))', gap: '2.4cqw' }}>
            {p.panels.slice(0, 6).map((pn, k) => (
              <div key={pn.id} style={{ position: 'relative', minHeight: 0, border: `max(2px, 0.9cqw) solid ${ink}`, background: '#FFFFFF', overflow: 'hidden', boxShadow: `0.9cqw 0.9cqw 0 ${ink}` }}>
                {done && v?.panelBlobIds[k] ? <Art blobId={v.panelBlobIds[k]} alt="" /> : <Overlay status={status === 'done' ? 'none' : status} grid />}
                {pn.bubble.trim() && (
                  <div style={{ position: 'absolute', top: '1.4cqw', left: k % 2 ? 'auto' : '1.4cqw', right: k % 2 ? '1.4cqw' : 'auto', maxWidth: '82%', background: '#FFFFFF', border: `max(1.5px, 0.6cqw) solid ${ink}`, borderRadius: '3.5cqw', padding: '1cqw 1.8cqw', fontWeight: 700, fontSize: '2.7cqw', lineHeight: 1.2 }}>
                    {pn.bubble}
                  </div>
                )}
              </div>
            ))}
          </div>
          {!done && (
            <p style={{ margin: 0, alignSelf: 'center', fontFamily: BANGERS, fontSize: '5cqw', letterSpacing: '.04em', background: '#FFFFFF', border: `max(2px, 0.9cqw) solid ${ink}`, padding: '0.8cqw 3cqw' }}>
              {status === 'drawing' ? 'Drawing 6 panels…' : status === 'queued' ? 'Waiting its turn' : status === 'failed' ? "Couldn't draw this page" : 'Not drawn yet'}
            </p>
          )}
        </>
      ) : (
        <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative', border: `max(2px, 1.2cqw) solid ${ink}`, background: '#FFFFFF', overflow: 'hidden', boxShadow: `1.4cqw 1.4cqw 0 ${ink}` }}>
          {artSrc ? <img src={artSrc} alt={p.caption} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
            : done && v?.blobId ? <Art blobId={v.blobId} alt={p.caption} /> : null}
          <Overlay status={status} />
          {done && isMiddle && p.bubble.trim() && (
            <div style={{ position: 'absolute', top: '3cqw', left: '3cqw', maxWidth: '62%', background: '#FFFFFF', border: `max(2px, 0.9cqw) solid ${ink}`, borderRadius: '5cqw', padding: '2cqw 3.2cqw', fontWeight: 700, fontSize: '3.9cqw', lineHeight: 1.25, boxShadow: `0.9cqw 0.9cqw 0 ${ink}` }}>
              {p.bubble}
              <span aria-hidden="true" style={{ position: 'absolute', left: '6cqw', bottom: '-2.6cqw', width: '4cqw', height: '4cqw', background: '#FFFFFF', borderRight: `max(2px, 0.9cqw) solid ${ink}`, borderBottom: `max(2px, 0.9cqw) solid ${ink}`, transform: 'rotate(45deg)' }} />
            </div>
          )}
          {isMiddle && p.layout === 'full' && p.caption.trim() && (
            <p style={{ ...captionStyle, position: 'absolute', left: '3cqw', right: '3cqw', bottom: '3cqw' }}>{p.caption}</p>
          )}
        </div>
      )}

      {isMiddle && p.layout !== 'full' && p.caption.trim() && <p style={captionStyle}>{p.caption}</p>}

      {p.kind === 'cover' && starring && (
        <p style={{ margin: 0, alignSelf: 'center', background: '#FFFFFF', border: `max(2px, 0.9cqw) solid ${ink}`, padding: '1.6cqw 4cqw', fontWeight: 700, fontSize: '3.8cqw', textAlign: 'center', boxShadow: `1cqw 1cqw 0 ${ink}` }}>
          {starring}
        </p>
      )}

      {p.kind === 'end' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5cqw' }}>
          {p.caption.trim() && (
            <p style={{ margin: 0, fontWeight: 700, fontSize: '4.2cqw', lineHeight: 1.3, textAlign: 'center', background: '#FFFFFF', border: `max(2px, 0.9cqw) solid ${ink}`, padding: '2cqw 3cqw', textWrap: 'pretty' } as CSSProperties}>{p.caption}</p>
          )}
          <p style={{ margin: 0, fontFamily: BANGERS, fontSize: '19cqw', lineHeight: 0.95, letterSpacing: '.02em', color: '#FFFFFF', WebkitTextStroke: `0.7cqw ${ink}`, paintOrder: 'stroke fill', textShadow: `1.4cqw 1.4cqw 0 ${ink}` } as CSSProperties}>The End</p>
        </div>
      )}

      {isMiddle && pageNo && (
        <span aria-hidden="true" style={{ position: 'absolute', top: '1.6cqw', right: '1.6cqw', minWidth: '6cqw', height: '6cqw', padding: '0 1cqw', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: `max(2px, 0.7cqw) solid ${ink}`, borderRadius: 999, fontWeight: 700, fontSize: '3.2cqw' }}>{pageNo}</span>
      )}
    </div>
    </div>
  );
}
