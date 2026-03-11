import { renderHook, act } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

test('duplicateClip correctly copies caption data to the new clip if it is a caption clip', () => {
  const { result } = renderHook(() => useProject());

  let clipId: string = '';

  act(() => {
    // Add a caption clip
    const clip = result.current!.addCaptionClip([{text: "test", start: 0, end: 5}], 0, 5);
    clipId = clip.id;
  });

  expect(clipId).toBeTruthy();
  expect(result.current.captionData[clipId]).toBeDefined();

  let duplicatedClipId: string | null = null;
  act(() => {
    // Attempt to duplicate clip
    duplicatedClipId = result.current!.duplicateClip(clipId);
  });

  expect(duplicatedClipId).toBeTruthy();

  const duplicatedClip = result.current!.clips.find(c => c.id === duplicatedClipId);
  expect(duplicatedClip).toBeDefined();

  // The duplicated clip should ALSO have caption data!
  expect(result.current.captionData[duplicatedClipId!]).toBeDefined();
});
