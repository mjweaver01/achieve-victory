import { useCallback, useEffect, useRef, useState } from 'react';
import { useElapsedTimer } from '../hooks/useElapsedTimer';
import { isLocalDevHost } from './GameToolbar';
import {
  type UndoRedoActions,
  useUndoRedo,
  useUndoRedoKeyboard,
} from '../hooks/useUndoRedo';
import type { Game2048Progress } from '../../types/progress';
import { formatDuration } from '../utils/time';

const SIZE = 4;
const CELL_COUNT = SIZE * SIZE;
const BEST_KEY = 'madeon-game:2048:best';

function tileClass(value: number): string {
  if (value === 0) return 'empty';
  if (value > 2048) return 'filled vMax';
  return `filled v${value}`;
}

function loadBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? Math.max(0, Number.parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

function saveBest(value: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    /* ignore */
  }
}

type Direction = 'up' | 'down' | 'left' | 'right';
type Outcome = Game2048Progress['outcome'];

type Props = {
  saved?: Game2048Progress;
  onWin: (elapsedMs: number, score?: number) => void;
  onProgressChange: (progress: Game2048Progress) => void;
  onUndoRedoReady?: (actions: UndoRedoActions | null) => void;
};

function createEmptyBoard(): number[] {
  return Array.from({ length: CELL_COUNT }, () => 0);
}

function pickRandomEmptyIndex(board: number[]): number | null {
  const empties = board
    .map((value, idx) => (value === 0 ? idx : -1))
    .filter(idx => idx >= 0);
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)] ?? null;
}

function addRandomTile(board: number[]): number[] {
  const idx = pickRandomEmptyIndex(board);
  if (idx == null) return board;
  const next = [...board];
  next[idx] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function createInitialBoard(): number[] {
  return addRandomTile(addRandomTile(createEmptyBoard()));
}

function slideRowLeft(row: number[]): { row: number[]; gain: number } {
  const filtered = row.filter(v => v > 0);
  const merged: number[] = [];
  let gain = 0;
  for (let i = 0; i < filtered.length; i += 1) {
    const current = filtered[i]!;
    const next = filtered[i + 1];
    if (next != null && next === current) {
      const value = current * 2;
      merged.push(value);
      gain += value;
      i += 1;
    } else {
      merged.push(current);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { row: merged, gain };
}

function boardToRows(board: number[]): number[][] {
  return Array.from({ length: SIZE }, (_, r) =>
    board.slice(r * SIZE, r * SIZE + SIZE)
  );
}

function rowsToBoard(rows: number[][]): number[] {
  return rows.flat();
}

function transpose(rows: number[][]): number[][] {
  return rows[0]!.map((_, i) => rows.map(row => row[i]!));
}

function reverseRows(rows: number[][]): number[][] {
  return rows.map(row => [...row].reverse());
}

function moveBoard(
  board: number[],
  direction: Direction
): { board: number[]; gain: number; moved: boolean } {
  let rows = boardToRows(board);
  const vertical = direction === 'up' || direction === 'down';
  const reverse = direction === 'right' || direction === 'down';
  if (vertical) rows = transpose(rows);
  if (reverse) rows = reverseRows(rows);

  let gain = 0;
  const movedRows = rows.map(row => {
    const result = slideRowLeft(row);
    gain += result.gain;
    return result.row;
  });

  let normalized = movedRows;
  if (reverse) normalized = reverseRows(normalized);
  if (vertical) normalized = transpose(normalized);
  const nextBoard = rowsToBoard(normalized);
  const moved = nextBoard.some((value, idx) => value !== board[idx]);
  return { board: nextBoard, gain, moved };
}

function hasMoves(board: number[]): boolean {
  if (board.some(v => v === 0)) return true;
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  return dirs.some(dir => moveBoard(board, dir).moved);
}

export function Game2048({ saved, onWin, onProgressChange, onUndoRedoReady }: Props) {
  const [board, setBoard] = useState<number[]>(
    () => saved?.board ?? createInitialBoard()
  );
  const [score, setScore] = useState(saved?.score ?? 0);
  const [startedAt, setStartedAt] = useState<number | null>(
    saved?.startedAt ?? null
  );
  const [outcome, setOutcome] = useState<Outcome>(saved?.outcome ?? 'playing');
  const [statusText, setStatusText] = useState(saved?.statusText ?? '');
  const [frozenElapsedMs, setFrozenElapsedMs] = useState(0);
  const [best, setBest] = useState<number>(() => loadBest());
  const wonRef = useRef(false);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      saveBest(score);
    }
  }, [score, best]);

  const elapsedMs = useElapsedTimer({
    startedAt,
    frozenMs: frozenElapsedMs,
    isStopped: outcome !== 'playing',
  });

  useEffect(() => {
    onProgressChange({ board, score, startedAt, outcome, statusText });
  }, [board, score, startedAt, outcome, statusText, onProgressChange]);

  type Snapshot = {
    board: number[];
    score: number;
    outcome: Outcome;
    statusText: string;
    frozenElapsedMs: number;
  };

  const getSnapshot = useCallback(
    (): Snapshot => ({
      board: [...board],
      score,
      outcome,
      statusText,
      frozenElapsedMs,
    }),
    [board, score, outcome, statusText, frozenElapsedMs]
  );

  const applySnapshot = useCallback((snapshot: Snapshot) => {
    setBoard(snapshot.board);
    setScore(snapshot.score);
    setOutcome(snapshot.outcome);
    setStatusText(snapshot.statusText);
    setFrozenElapsedMs(snapshot.frozenElapsedMs);
    if (snapshot.outcome !== 'won') wonRef.current = false;
  }, []);

  const historyEnabled =
    outcome === 'playing' || (outcome === 'lost' && isLocalDevHost());
  const { pushHistory, undo, redo, canUndo, canRedo } = useUndoRedo(
    getSnapshot,
    applySnapshot,
    { enabled: historyEnabled }
  );

  useUndoRedoKeyboard(undo, redo, historyEnabled);

  useEffect(() => {
    if (!onUndoRedoReady) return;
    if (!historyEnabled) {
      onUndoRedoReady(null);
      return;
    }
    onUndoRedoReady({ undo, redo, canUndo, canRedo });
  }, [
    onUndoRedoReady,
    historyEnabled,
    undo,
    redo,
    canUndo,
    canRedo,
  ]);

  const finishWin = useCallback(
    (start: number | null, nextScore: number) => {
      if (wonRef.current) return;
      wonRef.current = true;
      const ms = Math.max(1, Date.now() - (start ?? Date.now()));
      setFrozenElapsedMs(ms);
      setOutcome('won');
      setStatusText('2048 reached! Generating your code...');
      onWin(ms, nextScore);
    },
    [onWin]
  );

  const applyMove = useCallback(
    (direction: Direction) => {
      if (outcome !== 'playing') return;
      const result = moveBoard(board, direction);
      if (!result.moved) return;

      pushHistory();

      let start = startedAt;
      if (!start) {
        start = Date.now();
        setStartedAt(start);
      }

      const nextScore = score + result.gain;
      const withSpawn = addRandomTile(result.board);
      setBoard(withSpawn);
      setScore(nextScore);

      if (withSpawn.some(v => v >= 2048)) {
        finishWin(start, nextScore);
        return;
      }

      if (!hasMoves(withSpawn)) {
        const ms = start ? Math.max(1, Date.now() - start) : 0;
        setFrozenElapsedMs(ms);
        setOutcome('lost');
        setStatusText('No more moves. Start over and try again.');
      }
    },
    [outcome, board, startedAt, score, finishWin, pushHistory]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        applyMove('up');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        applyMove('down');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        applyMove('left');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        applyMove('right');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyMove]);

  return (
    <div className="game2048-wrap">
      <div className="game2048-header">
        <div className="game2048-stat">
          <span className="game2048-stat-label">Time</span>
          <span className="game2048-stat-value">
            {formatDuration(elapsedMs)}
          </span>
        </div>
        <div className="game2048-stat">
          <span className="game2048-stat-label">Score</span>
          <span className="game2048-stat-value">{score}</span>
        </div>
        <div className="game2048-stat best">
          <span className="game2048-stat-label">Best</span>
          <span className="game2048-stat-value">{best}</span>
        </div>
      </div>

      {statusText ? <p className="timer">{statusText}</p> : null}

      <div className="game2048-grid" role="grid" aria-label="2048 board">
        {board.map((value, idx) => (
          <div
            key={idx}
            className={`game2048-cell ${tileClass(value)}`}
            role="gridcell"
          >
            {value === 0 ? '' : value}
          </div>
        ))}
      </div>

      <p className="game2048-hint">Use arrow keys or buttons</p>

      <div className="game2048-controls">
        <button
          type="button"
          className="secondary game2048-arrow up"
          onClick={() => applyMove('up')}
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className="secondary game2048-arrow left"
          onClick={() => applyMove('left')}
          aria-label="Move left"
        >
          ←
        </button>
        <button
          type="button"
          className="secondary game2048-arrow down"
          onClick={() => applyMove('down')}
          aria-label="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          className="secondary game2048-arrow right"
          onClick={() => applyMove('right')}
          aria-label="Move right"
        >
          →
        </button>
      </div>
    </div>
  );
}
