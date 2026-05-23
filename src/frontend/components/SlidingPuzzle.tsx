import { useCallback, useEffect, useRef, useState } from 'react';
import { useElapsedTimer } from '../hooks/useElapsedTimer';
import type { PuzzleProgress } from '../utils/gameProgress';
import {
  applyPuzzleMove,
  createFreshPuzzleBoard,
  isPuzzleSolved,
  normalizePuzzleBoard,
  PUZZLE_SIZE,
  tileLabel,
} from '../utils/puzzleBoard';
import { formatDuration } from '../utils/time';

type Props = {
  saved?: PuzzleProgress;
  shouldResumeComplete?: boolean;
  onComplete: (elapsedMs: number) => void;
  onProgressChange: (progress: PuzzleProgress) => void;
};

export function SlidingPuzzle({
  saved,
  shouldResumeComplete = false,
  onComplete,
  onProgressChange,
}: Props) {
  const completedRef = useRef(false);

  const [board, setBoard] = useState(() =>
    saved?.board ? normalizePuzzleBoard(saved.board) : createFreshPuzzleBoard()
  );
  const [startedAt, setStartedAt] = useState<number | null>(
    saved?.startedAt ?? null
  );
  const [frozenElapsedMs, setFrozenElapsedMs] = useState(
    () => (Number.isFinite(saved?.elapsedMs) ? saved!.elapsedMs : 0)
  );
  const [done, setDone] = useState(saved?.done ?? false);
  const [completionTimeMs, setCompletionTimeMs] = useState<
    number | undefined
  >(
    saved?.completionTimeMs != null && Number.isFinite(saved.completionTimeMs)
      ? saved.completionTimeMs
      : undefined
  );

  const elapsedMs = useElapsedTimer({
    startedAt,
    frozenMs: frozenElapsedMs,
    isStopped: done,
  });

  useEffect(() => {
    onProgressChange({
      board,
      startedAt,
      elapsedMs,
      done,
      completionTimeMs: done ? completionTimeMs : undefined,
    });
  }, [board, startedAt, elapsedMs, done, completionTimeMs, onProgressChange]);

  useEffect(() => {
    if (completedRef.current || !shouldResumeComplete) return;
    const ms = saved?.completionTimeMs;
    if (!saved?.done || ms == null || !Number.isFinite(ms)) return;
    completedRef.current = true;
    setDone(true);
    setFrozenElapsedMs(ms);
    onComplete(ms);
  }, [
    shouldResumeComplete,
    saved?.done,
    saved?.completionTimeMs,
    onComplete,
  ]);

  const move = useCallback(
    (index: number) => {
      if (done) return;

      const start = startedAt ?? Date.now();
      if (!startedAt) setStartedAt(start);

      setBoard(prev => {
        const normalized = normalizePuzzleBoard(prev);
        const next = applyPuzzleMove(normalized, index);
        if (!next) return normalized;

        if (isPuzzleSolved(next)) {
          const ms = Math.max(1, Date.now() - start);
          setDone(true);
          setFrozenElapsedMs(ms);
          setCompletionTimeMs(ms);
          onProgressChange({
            board: next,
            startedAt: start,
            elapsedMs: ms,
            done: true,
            completionTimeMs: ms,
          });
          onComplete(ms);
        }

        return next;
      });
    },
    [done, onComplete, onProgressChange, startedAt]
  );

  if (done) return null;

  return (
    <div>
      <p className="timer">
        Time: {formatDuration(elapsedMs)}
      </p>
      <div
        className="puzzle-grid"
        style={{ gridTemplateColumns: `repeat(${PUZZLE_SIZE}, 1fr)` }}
      >
        {board.map((value, index) => {
          const label = tileLabel(value);
          const isEmpty = label === '';
          return (
            <button
              key={`${index}-${value}`}
              type="button"
              className={`puzzle-tile${isEmpty ? ' empty' : ''}`}
              onClick={() => move(index)}
              disabled={isEmpty}
              aria-label={isEmpty ? 'empty' : `tile ${label}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
