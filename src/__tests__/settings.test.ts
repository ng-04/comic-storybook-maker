import { describe, expect, it, vi } from 'vitest';

describe('settings', () => {
  it('imports keys saved by v1 on the same origin', async () => {
    localStorage.clear();
    localStorage.setItem('comicAnthropicKey', 'sk-ant-v1');
    localStorage.setItem('comicWorkspaceId', 'wrkspc_1');
    localStorage.setItem('comicGeminiKey', 'gem-v1');
    vi.resetModules();
    const { getSettings, isConfigured } = await import('../state/settings');
    expect(getSettings()).toMatchObject({ anthropicKey: 'sk-ant-v1', workspaceId: 'wrkspc_1', geminiKey: 'gem-v1', demo: false });
    expect(isConfigured()).toBe(true);
  });
});
