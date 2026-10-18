import { describe, expect, it } from 'vitest';
import { decryptKeys, encryptKeys, passkeyProblem } from '../state/vault';

const keys = { anthropicKey: 'sk-ant-test-123', workspaceId: 'wrkspc_1', geminiKey: 'gem-test-456' };

describe('vault', () => {
  it('round-trips with the right passkey and hides the keys', async () => {
    const b = await encryptKeys(keys, 'mango-river-kite-2026');
    const json = JSON.stringify(b);
    expect(json).not.toContain('sk-ant-test-123');
    expect(json).not.toContain('gem-test-456');
    expect(await decryptKeys(b, 'mango-river-kite-2026')).toEqual(keys);
    expect(await decryptKeys(b, '  mango-river-kite-2026 ')).toEqual(keys);
  }, 30000);

  it('rejects a wrong passkey', async () => {
    const b = await encryptKeys(keys, 'mango-river-kite-2026');
    await expect(decryptKeys(b, 'admin')).rejects.toThrow('WRONG_PASSKEY');
  }, 30000);

  it('refuses short or obvious passkeys', async () => {
    expect(passkeyProblem('admin')).toBeTruthy();
    expect(passkeyProblem('administrator1')).toBeTruthy();
    expect(passkeyProblem('mango-river-kite-2026')).toBeNull();
    await expect(encryptKeys(keys, 'admin')).rejects.toThrow();
  });
});
