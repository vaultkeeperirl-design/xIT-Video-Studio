import { renderHook, act } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { useProject } from '../react-app/hooks/useProject';

test('closeSession correctly resets all state', async () => {
  renderHook(() => useProject());

  // Set mock state
  act(() => {
    localStorage.setItem('clipwise-session', JSON.stringify({ sessionId: 'test', createdAt: Date.now() }));
  });

  const { result: r2 } = renderHook(() => useProject());

  global.fetch = vi.fn().mockImplementation(async () => {
    return { ok: true, json: async () => ({}) };
  });

  act(() => {
    r2.current.addCaptionClip([{text: "test", start: 0, end: 5}], 0, 5);
  });

  const clipId = r2.current.clips[0].id;
  expect(r2.current.captionData[clipId]).toBeDefined();

  await act(async () => {
    await r2.current.closeSession();
  });

  expect(r2.current.clips.length).toBe(0);
  expect(r2.current.captionData).toEqual({});
});
