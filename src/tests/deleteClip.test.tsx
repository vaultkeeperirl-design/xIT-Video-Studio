import { renderHook, act } from '@testing-library/react';
import { expect, test } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

test('deleteClip correctly deletes caption data when a caption clip is deleted', () => {
  const { result } = renderHook(() => useProject());

  let clipId: string = '';

  act(() => {
    // Add a caption clip
    const clip = result.current!.addCaptionClip([{text: "test", start: 0, end: 5}], 0, 5);
    clipId = clip.id;
  });

  expect(clipId).toBeTruthy();
  expect(result.current.captionData[clipId]).toBeDefined();

  act(() => {
    // Attempt to delete clip
    result.current!.deleteClip(clipId);
  });

  const deletedClip = result.current!.clips.find(c => c.id === clipId);
  expect(deletedClip).toBeUndefined();

  // The deleted clip's caption data should ALSO be deleted!
  expect(result.current.captionData[clipId]).toBeUndefined();
});
