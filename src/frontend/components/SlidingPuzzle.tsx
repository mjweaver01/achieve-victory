import { useCallback, useEffect, useMemo, useState } from 'react';

const SIZE = 4;

function createSolved(): number[] {
  return Array.from({ length: SIZE * SIZE }, (_, i) => i);
}

function shuffle(board: number[]): number[] {
  const next = [...board];
  for (let i = 0; i < 200; i++) {
    const empty = next.indexOf(SIZE * SIZE - 1);
    const neighbors = getNeighbors(empty);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    if (pick == null) continue;
    [next[empty], next[pick]] = [next[pick]!, next[empty]!];
  }
  return next;
}

function getNeighbors(emptyIndex: number): number[] {
  const row = Math.floor(emptyIndex / SIZE);
  const col = emptyIndex % SIZE;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(emptyIndex - SIZE);
  if (row < SIZE - 1) neighbors.push(emptyIndex + SIZE);
  if (col > 0) neighbors.push(emptyIndex - 1);
  if (col < SIZE - 1) neighbors.push(emptyIndex + 1);
  return neighbors;
}

function isSolved(board: number[]): boolean {
  return board.every((v, i) => v === i);
}

type Props = {
  onComplete: (elapsedMs: number) => void;
};

export function SlidingPuzzle({ onComplete }: Props) {
  const [board, setBoard] = useState(() => shuffle(createSolved()));
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [done, setDone] = useState(false);

  const emptyIndex = useMemo(() => board.indexOf(SIZE * SIZE - 1), [board]);

  useEffect(() => {
    if (!startedAt || done) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(id);
  }, [startedAt, done]);

  const move = useCallback(
    (index: number) => {
      if (done) return;
      const neighbors = getNeighbors(emptyIndex);
      if (!neighbors.includes(index)) return;

      if (!startedAt) setStartedAt(Date.now());

      setBoard(prev => {
        const next = [...prev];
        [next[emptyIndex], next[index]] = [next[index]!, next[emptyIndex]!];
        if (isSolved(next)) {
          setDone(true);
          const start = startedAt ?? Date.now();
          onComplete(Date.now() - start);
        }
        return next;
      });
    },
    [done, emptyIndex, onComplete, startedAt]
  );

  return (
    <div>
      <p className="timer">
        {done
          ? 'Complete!'
          : `Time: ${(elapsedMs / 1000).toFixed(1)}s`}
      </p>
      <div
        className="puzzle-grid"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
      >
        {board.map((value, index) => {
          const isEmpty = value === SIZE * SIZE - 1;
          return (
            <button
              key={`${index}-${value}`}
              type="button"
              className={`puzzle-tile${isEmpty ? ' empty' : ''}`}
              onClick={() => move(index)}
              disabled={isEmpty || done}
              aria-label={isEmpty ? 'empty' : `tile ${value + 1}`}
            >
              {isEmpty ? '' : value + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
