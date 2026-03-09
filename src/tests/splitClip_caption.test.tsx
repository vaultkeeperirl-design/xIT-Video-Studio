import { renderHook, act } from '@testing-library/react';
import { useProject } from '../react-app/hooks/useProject';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('splitClip with captions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adjusts caption word timestamps and filters words correctly when splitting', () => {
    const { result } = renderHook(() => useProject());

    act(() => {
      // Create a caption clip spanning 10 seconds
      result.current.addCaptionClip(
        [
          { text: 'Hello', start: 0, end: 2 },
          { text: 'world', start: 3, end: 5 },
          { text: 'this', start: 6, end: 8 },
          { text: 'is', start: 8.5, end: 9.5 }
        ],
        0, // start
        10 // duration
      );
    });

    const clipId = result.current.clips[0].id;
    const splitTime = 5.5; // Split between "world" and "this"

    act(() => {
      result.current.splitClip(clipId, splitTime);
    });

    const clips = result.current.clips;
    expect(clips.length).toBe(2);

    const firstClip = clips[0];
    const secondClip = clips[1];

    const firstCaptionData = result.current.captionData[firstClip.id];
    const secondCaptionData = result.current.captionData[secondClip.id];

    // First clip should only have words before 5.5s
    expect(firstCaptionData.words).toHaveLength(2);
    expect(firstCaptionData.words[0].text).toBe('Hello');
    expect(firstCaptionData.words[1].text).toBe('world');

    // Second clip should only have words after 5.5s, and timestamps shifted by -5.5
    expect(secondCaptionData.words).toHaveLength(2);
    expect(secondCaptionData.words[0].text).toBe('this');
    expect(secondCaptionData.words[0].start).toBeCloseTo(0.5); // 6 - 5.5
    expect(secondCaptionData.words[0].end).toBeCloseTo(2.5);   // 8 - 5.5
    expect(secondCaptionData.words[1].text).toBe('is');
    expect(secondCaptionData.words[1].start).toBeCloseTo(3.0); // 8.5 - 5.5
    expect(secondCaptionData.words[1].end).toBeCloseTo(4.0);   // 9.5 - 5.5
  });
});
