import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

describe('deleteAsset', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('removes asset and its associated clips and their caption data', async () => {
    const { result } = renderHook(() => useProject());

    // 1. Give it a valid session
    act(() => {
      // Mock local storage to simulate loaded session
      localStorage.setItem('clipwise-session', JSON.stringify({ sessionId: 'test', createdAt: Date.now() }));
    });

    // re-render hook to pick up session
    const { result: r2 } = renderHook(() => useProject());

    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      return { ok: true, json: async () => ({}) };
    });

    const assetId = 'test-asset-id';
    let clipId = '';

    // 2. Add an asset and a clip pointing to it
    act(() => {
      // Create a clip manually via addClip (it'll assume it exists if we force it)
      const clip = r2.current.addClip(assetId, 'V1', 0, 5);
      clipId = clip.id;
    });

    // 3. Add caption data for this clip manually
    // Since addCaptionClip adds a new clip, let's just make it that clip!
    act(() => {
      // We can force caption data by adding a batch
      r2.current.addCaptionClipsBatch([{words: [{text: 'hello', start: 0, end: 1}], start: 0, duration: 1}]);
    });

    // We get the new clip id
    const captionClip = r2.current.clips[r2.current.clips.length - 1];

    // Now we update its assetId manually using updateClip! (It's a caption clip but we trick it to have an assetId)
    act(() => {
      r2.current.updateClip(captionClip.id, { assetId });
    });

    // 4. Verify we have a clip with this assetId, and it HAS caption data
    expect(r2.current.clips.find(c => c.assetId === assetId)).toBeDefined();
    expect(r2.current.captionData[captionClip.id]).toBeDefined();

    // 5. Delete the asset!
    await act(async () => {
      await r2.current.deleteAsset(assetId);
    });

    // 6. Verify the clip was removed
    expect(r2.current.clips.find(c => c.assetId === assetId)).toBeUndefined();

    // 7. Verify the caption data for the clip was ALSO removed!
    expect(r2.current.captionData[captionClip.id]).toBeUndefined();
  });
});
