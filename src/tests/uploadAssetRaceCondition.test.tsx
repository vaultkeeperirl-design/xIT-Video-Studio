import { renderHook, act } from '@testing-library/react';
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

beforeEach(() => {
  global.fetch = vi.fn();
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

test('uploadAsset should not create multiple sessions concurrently', async () => {
  const { result } = renderHook(() => useProject());

  let sessionCreateCount = 0;

  const mockFetch = vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('/session/create')) {
      sessionCreateCount++;
      // Return a delayed response to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        ok: true,
        json: async () => ({ sessionId: `session-${sessionCreateCount}`, createdAt: Date.now() })
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

  global.fetch = mockFetch;

  const file1 = new File(['1'], '1.mp4', { type: 'video/mp4' });
  const file2 = new File(['2'], '2.mp4', { type: 'video/mp4' });

  // Simulate dropping multiple files at once, leading to concurrent calls
  await act(async () => {
    const promise1 = result.current.uploadAsset(file1);
    const promise2 = result.current.uploadAsset(file2);
    await Promise.all([promise1, promise2]);
  });

  // If there's a race condition, sessionCreateCount might be > 1
  expect(sessionCreateCount).toBe(1);
});
