import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { _resetLLMForTesting } from '../../src/shared/llm/index.js';

describe('LLM provider selection', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    _resetLLMForTesting();
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    _resetLLMForTesting();
  });

  it('uses gemini by default when GEMINI_API_KEY is present', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    vi.resetModules();
    const mod = await import('../../src/shared/llm/index.js');
    const llm = mod.getLLM();
    expect(llm.provider).toBe('gemini');
    expect(llm.defaultModel).toMatch(/gemini-/);
  });

  it('uses openai-compat when LLM_PROVIDER=openai-compat with key', async () => {
    process.env.LLM_PROVIDER = 'openai-compat';
    process.env.LLM_OPENAI_API_KEY = 'sk-test';
    process.env.LLM_OPENAI_BASE_URL = 'https://api.openai.com/v1';
    process.env.LLM_OPENAI_MODEL = 'gpt-4o-mini';
    vi.resetModules();
    const mod = await import('../../src/shared/llm/index.js');
    const llm = mod.getLLM();
    expect(llm.provider).toBe('openai-compat');
    expect(llm.defaultModel).toBe('gpt-4o-mini');
  });

  it('throws clear error when gemini chosen but no key', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
    const mod = await import('../../src/shared/llm/index.js');
    expect(() => mod.getLLM()).toThrow(/api_key_missing/);
  });
});
