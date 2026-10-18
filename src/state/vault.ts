// Passkey-protected API keys.
// The owner encrypts their keys with a passkey in Settings and publishes only the ciphertext
// (public/keys.enc.json). On load, anyone who knows the passkey can unlock the keys into their
// browser. The file is public, so the passkey is the only protection: it must be long enough that
// guessing it offline is impractical (PBKDF2-SHA256 with 600k rounds slows each guess down).

export interface SharedKeys {
  anthropicKey: string;
  workspaceId: string;
  geminiKey: string;
}

export interface KeyBundle {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  data: string;
  createdAt: string;
}

export const MIN_PASSKEY_LENGTH = 12;
const ITERATIONS = 600_000;

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passkey: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passkey.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function passkeyProblem(passkey: string): string | null {
  const p = passkey.trim();
  if (p.length < MIN_PASSKEY_LENGTH) return `Use at least ${MIN_PASSKEY_LENGTH} characters. A short phrase works well, e.g. "mango-river-kite-2026".`;
  if (/^(.)\1+$/.test(p) || /^(admin|password|passkey|123456)/i.test(p)) return 'That passkey is too easy to guess.';
  return null;
}

export async function encryptKeys(keys: SharedKeys, passkey: string): Promise<KeyBundle> {
  const problem = passkeyProblem(passkey);
  if (problem) throw new Error(problem);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passkey.trim(), salt, ITERATIONS);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(JSON.stringify(keys))));
  return { v: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data), createdAt: new Date().toISOString() };
}

/** Throws Error('WRONG_PASSKEY') when the passkey doesn't match. */
export async function decryptKeys(bundle: KeyBundle, passkey: string): Promise<SharedKeys> {
  const key = await deriveKey(passkey.trim(), unb64(bundle.salt), bundle.iterations);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(bundle.iv) as BufferSource }, key, unb64(bundle.data) as BufferSource);
    const k = JSON.parse(dec.decode(plain));
    return { anthropicKey: k.anthropicKey || '', workspaceId: k.workspaceId || '', geminiKey: k.geminiKey || '' };
  } catch {
    throw new Error('WRONG_PASSKEY');
  }
}

let bundlePromise: Promise<KeyBundle | null> | null = null;

/** The published bundle, or null when the site has none. */
export function loadBundle(): Promise<KeyBundle | null> {
  if (!bundlePromise) {
    bundlePromise = fetch('./keys.enc.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.v === 1 && j.data ? (j as KeyBundle) : null))
      .catch(() => null);
  }
  return bundlePromise;
}
