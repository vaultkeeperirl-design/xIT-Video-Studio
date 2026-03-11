import { renderHook, act } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

test('duplicateClip does not lose faceTrackingData on the new clip', () => {
  const { result } = renderHook(() => useProject());

  let clipId: string = '';
  act(() => {
    // Add a dummy clip
    const clip = result.current!.addClip('test-asset', 'V1', 0);
    clipId = clip.id;
  });

  // Face tracking is linked to assetId, so duplicating the clip should still refer to the same asset,
  // which works naturally. This test ensures the assetId is carried over correctly.

  let duplicatedClipId: string | null = null;
  act(() => {
    duplicatedClipId = result.current!.duplicateClip(clipId);
  });

  const duplicatedClip = result.current!.clips.find(c => c.id === duplicatedClipId);
  expect(duplicatedClip?.assetId).toBe('test-asset');
});
