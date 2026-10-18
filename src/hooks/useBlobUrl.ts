import { useEffect, useState } from 'react';
import { blobUrl } from '../state/db';

/** Object URL for an image blob stored in IndexedDB ('' while loading or when missing). */
export function useBlobUrl(id: string | undefined | null): string {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    let live = true;
    if (id) blobUrl(id).then((url) => { if (live) setLoaded({ id, url }); });
    return () => { live = false; };
  }, [id]);
  return id && loaded?.id === id ? loaded.url : '';
}
