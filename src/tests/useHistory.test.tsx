import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../react-app/hooks/useHistory';
import { describe, it, expect } from 'vitest';

describe('useHistory', () => {
  it('should undo and redo correctly', () => {
    const { result } = renderHook(() => useHistory(0));

    expect(result.current.state).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.snapshot();
      result.current.set(1);
    });

    expect(result.current.state).toBe(1);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should handle functional updates', () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => {
      result.current.snapshot();
      result.current.set(prev => prev + 1);
    });

    expect(result.current.state).toBe(1);
  });

  it('should clear future when a new action happens after undo', () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => {
      result.current.snapshot();
      result.current.set(1);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    // Now make a new action
    act(() => {
      result.current.snapshot(); // Start a new sequence
      result.current.set(2);
    });

    expect(result.current.state).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false); // Future should be cleared!
  });

  it('should not throw if we call undo and past is empty', () => {
    const { result } = renderHook(() => useHistory(0));
    expect(result.current.canUndo).toBe(false);
    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toBe(0);
  });

  it('should not throw if we call redo and future is empty', () => {
    const { result } = renderHook(() => useHistory(0));
    expect(result.current.canRedo).toBe(false);
    act(() => {
      result.current.redo();
    });
    expect(result.current.state).toBe(0);
  });

  it('should clear future when a new snapshot happens', () => {
    const { result } = renderHook(() => useHistory(0));
    act(() => {
      result.current.snapshot();
      result.current.set(1);
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.snapshot();
    });
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear future when a new state is set directly', () => {
    const { result } = renderHook(() => useHistory(0));

    act(() => {
      result.current.snapshot();
      result.current.set(1);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    // Set a new state, which means we are deviating from history
    act(() => {
      result.current.set(2);
    });

    expect(result.current.canRedo).toBe(false);
  });
});
