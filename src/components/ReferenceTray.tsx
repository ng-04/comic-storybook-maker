import { useId } from 'react';
import { fmtSize } from '../domain/model';
import type { RefImage } from '../domain/types';
import { IconImage, IconX } from './Icons';

/** Chips for reference images plus an "Add images" picker (JPEG/PNG/WebP/HEIC, ≤10 MB, ≤8 per pick). */
export function ReferenceTray({ refs, onAdd, onRemove, heic = true }: {
  refs: RefImage[]; onAdd: (files: File[]) => void; onRemove: (r: RefImage) => void; heic?: boolean;
}) {
  const id = useId();
  return (
    <>
      {refs.length > 0 && (
        <div className="row gap-8">
          {refs.map((r) => (
            <span className="reftile" key={r.id}>
              <IconImage />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{r.name}</span>
              <span className="muted" style={{ fontSize: 13 }}>{fmtSize(r.size)}</span>
              <button className="btn btn-sm" style={{ minHeight: 36, width: 36, padding: 0, boxShadow: 'none' }} aria-label={`Delete ${r.name}`} onClick={() => onRemove(r)}><IconX size={14} /></button>
            </span>
          ))}
        </div>
      )}
      <div>
        <input
          className="sr-only file-in" id={id} type="file" multiple
          accept={`image/jpeg,image/png,image/webp${heic ? ',image/heic' : ''}`}
          onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ''; if (files.length) onAdd(files); }}
        />
        <label className="btn btn-sm" htmlFor={id}>Add images</label>
      </div>
    </>
  );
}
