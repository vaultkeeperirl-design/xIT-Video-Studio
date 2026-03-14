import { renderHook, act } from '@testing-library/react';
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
  localStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

test('uploadAsset should not create multiple sessions if called concurrently/sequentially in same render', async () => {
  const { result } = renderHook(() => useProject());

  let sessionCreateCount = 0;

  global.fetch = vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('/session/create')) {
      sessionCreateCount++;
      return {
        ok: true,
        json: async () => ({ sessionId: `session-${sessionCreateCount}` })
      };
    }
    if (url.includes('/assets')) {
      return {
        ok: true,
        json: async () => ({
          asset: { id: `asset-${Date.now()}`, type: 'video', filename: 'test.mp4', duration: 10, size: 100 }
        })
      };
    }
    return { ok: true, json: async () => ({}) };
  });

  const file1 = new File(['1'], '1.mp4', { type: 'video/mp4' });
  const file2 = new File(['2'], '2.mp4', { type: 'video/mp4' });

  // Simulate handleAssetUpload loop logic
  await act(async () => {
    await result.current.uploadAsset(file1);
    await result.current.uploadAsset(file2);
  });

  // Only 1 session should be created
  expect(sessionCreateCount).toBe(1);
});
