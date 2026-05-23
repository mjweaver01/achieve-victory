import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MAX_HISTORY = 100;

export type UndoRedoActions = {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

type Options = {
  enabled?: boolean;
  maxHistory?: number;
};

export function useUndoRedo<T>(
  getSnapshot: () => T,
  applySnapshot: (snapshot: T) => void,
  { enabled = true, maxHistory = DEFAULT_MAX_HISTORY }: Options = {}
) {
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  const pushHistory = useCallback(() => {
    if (!enabled) return;
    pastRef.current.push(getSnapshot());
    if (pastRef.current.length > maxHistory) pastRef.current.shift();
    futureRef.current = [];
    setHistoryVersion(v => v + 1);
  }, [enabled, getSnapshot, maxHistory]);

  const undo = useCallback(() => {
    if (!enabled) return;
    const past = pastRef.current;
    if (past.length === 0) return;

    futureRef.current.push(getSnapshot());
    applySnapshot(past.pop()!);
    setHistoryVersion(v => v + 1);
  }, [enabled, getSnapshot, applySnapshot]);

  const redo = useCallback(() => {
    if (!enabled) return;
    const future = futureRef.current;
    if (future.length === 0) return;

    pastRef.current.push(getSnapshot());
    applySnapshot(future.pop()!);
    setHistoryVersion(v => v + 1);
  }, [enabled, getSnapshot, applySnapshot]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setHistoryVersion(v => v + 1);
  }, []);

  void historyVersion;
  const canUndo = enabled && pastRef.current.length > 0;
  const canRedo = enabled && futureRef.current.length > 0;

  return { pushHistory, undo, redo, clearHistory, canUndo, canRedo };
}

export function useUndoRedoKeyboard(
  undo: () => void,
  redo: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, enabled]);
}
