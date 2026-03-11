import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

describe('deleteAsset faceTrackingData', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('removes faceTrackingData when asset is deleted', async () => {
    const { result } = renderHook(() => useProject());

    // 1. Give it a valid session
    act(() => {
      // Mock local storage to simulate loaded session
      localStorage.setItem('clipwise-session', JSON.stringify({ sessionId: 'test', createdAt: Date.now() }));
    });

    // re-render hook to pick up session
    const { result: r2 } = renderHook(() => useProject());

    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      if (url.includes('/detect-faces')) {
        return { ok: true, json: async () => ({ tracks: [{ id: 1 }] }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const assetId = 'test-asset-id';

    // Fetch face tracking data to populate it
    await act(async () => {
      await r2.current.detectFaces(assetId);
    });

    expect(r2.current.faceTrackingData[assetId]).toBeDefined();

    // Delete the asset
    await act(async () => {
      await r2.current.deleteAsset(assetId);
    });

    // Verify the face tracking data was removed
    expect(r2.current.faceTrackingData[assetId]).toBeUndefined();
  });
});
