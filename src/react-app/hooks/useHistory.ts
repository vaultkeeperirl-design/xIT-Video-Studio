import { useState, useCallback } from 'react';

/**
 * Represents the undo/redo stack state.
 * @template T The type of the state being tracked.
 */
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * Custom hook to manage undo/redo history for a given state.
 *
 * **Why use `snapshot` + `set`?**
 * In complex UIs (like dragging a clip on a timeline), updating the state on every mouse move
 * would flood the history stack with hundreds of tiny, useless states.
 * Instead, we use a two-step approach for continuous interactions:
 * 1. Call `snapshot()` when the interaction starts (e.g., `onDragStart`). This saves the *current*
 *    good state to the `past` array.
 * 2. Call `set()` repeatedly during the interaction (e.g., `onDrag`). This updates the `present`
 *    state for the UI to reflect changes instantly, *without* adding new entries to the `past` stack.
 *
 * @template T The type of the state to track.
 * @param initialState The initial state value.
 */
export function useHistory<T>(initialState: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  /**
   * Reverts the `present` state to the most recent state in the `past` array.
   * The current `present` state is pushed to the `future` array.
   */
  const undo = useCallback(() => {
    setState((currentState) => {
      const { past, present, future } = currentState;
      if (past.length === 0) return currentState;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);

  /**
   * Advances the `present` state to the next state in the `future` array.
   * The current `present` state is pushed to the `past` array.
   */
  const redo = useCallback(() => {
    setState((currentState) => {
      const { past, present, future } = currentState;
      if (future.length === 0) return currentState;

      const next = future[0];
      const newFuture = future.slice(1);

      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  /**
   * Updates the `present` state *without* modifying the `past` or `future` arrays.
   * Use this for continuous updates (like dragging) to prevent flooding the history stack.
   * Ensure `snapshot()` was called before a sequence of `set()` calls.
   *
   * @param newPresent The new state value, or an updater function.
   */
  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setState((currentState) => {
      const { present } = currentState;
      const value = newPresent instanceof Function ? newPresent(present) : newPresent;

      if (value === present) {
        return currentState;
      }

      return {
        ...currentState,
        present: value,
      };
    });
  }, []);

  /**
   * Commits the current `present` state to the `past` array and clears the `future` array.
   * Call this *before* starting a continuous interaction (like a drag) to save the "before" state.
   */
  const snapshot = useCallback(() => {
    setState((currentState) => {
      const { past, present } = currentState;

      return {
        past: [...past, present],
        present,
        future: [],
      };
    });
  }, []);

  /**
   * Clears all history, retaining only the current `present` state.
   */
  const clear = useCallback(() => {
    setState((currentState) => ({
      past: [],
      present: currentState.present,
      future: [],
    }));
  }, []);

  return {
    state: state.present,
    set,
    undo,
    redo,
    snapshot,
    clear,
    canUndo,
    canRedo,
  };
}