import { Chess, type Move, type Square } from 'chess.js';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Chessboard,
  type PieceHandlerArgs,
  type SquareHandlerArgs,
} from 'react-chessboard';
import { useElapsedTimer } from '../hooks/useElapsedTimer';
import { isLocalDevHost } from './GameToolbar';
import {
  type UndoRedoActions,
  useUndoRedo,
  useUndoRedoKeyboard,
} from '../hooks/useUndoRedo';
import type { ChessProgress } from '../../types/progress';
import { formatDuration } from '../utils/time';

type Outcome = ChessProgress['outcome'];

const DEFAULT_STATUS = '';

type Props = {
  saved?: ChessProgress;
  onWin: (elapsedMs: number) => void;
  onProgressChange: (progress: ChessProgress) => void;
  onUndoRedoReady?: (actions: UndoRedoActions | null) => void;
};

function playerWon(game: Chess): boolean {
  return game.isCheckmate() && game.turn() === 'b';
}

function playerLost(game: Chess): boolean {
  return game.isCheckmate() && game.turn() === 'w';
}

function pickBotMove(game: Chess): void {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return;
  const move = moves[Math.floor(Math.random() * moves.length)];
  if (move) game.move(move);
}

function loadGame(saved?: ChessProgress): Chess {
  if (saved?.fen) {
    try {
      return new Chess(saved.fen);
    } catch {
      return new Chess();
    }
  }
  return new Chess();
}

const MOVE_DOT_STYLE: CSSProperties = {
  background:
    'radial-gradient(circle, var(--chess-move-dot) 22%, transparent 22%)',
};

const CAPTURE_RING_STYLE: CSSProperties = {
  background:
    'radial-gradient(circle, transparent 58%, var(--chess-capture-ring) 58%)',
};

function getMoveSquareStyles(
  game: Chess,
  from: Square
): Record<string, CSSProperties> {
  let moves: Move[];
  try {
    moves = game.moves({ square: from, verbose: true });
  } catch {
    return {};
  }

  const styles: Record<string, CSSProperties> = {
    [from]: { backgroundColor: 'var(--chess-selected)' },
  };

  for (const move of moves) {
    styles[move.to] = move.captured ? CAPTURE_RING_STYLE : MOVE_DOT_STYLE;
  }

  return styles;
}

export function ChessMatch({
  saved,
  onWin,
  onProgressChange,
  onUndoRedoReady,
}: Props) {
  const gameRef = useRef(loadGame(saved));
  const [startedAt, setStartedAt] = useState<number | null>(
    saved?.startedAt ?? null
  );
  const [frozenElapsedMs, setFrozenElapsedMs] = useState(0);
  const [fen, setFen] = useState(gameRef.current.fen());
  const [outcome, setOutcome] = useState<Outcome>(saved?.outcome ?? 'playing');
  const [statusText, setStatusText] = useState(
    saved?.statusText ?? DEFAULT_STATUS
  );
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const elapsedMs = useElapsedTimer({
    startedAt,
    frozenMs: frozenElapsedMs,
    isStopped: outcome !== 'playing',
  });

  const persist = useCallback(
    (patch: Partial<ChessProgress>) => {
      onProgressChange({
        fen: gameRef.current.fen(),
        startedAt,
        outcome,
        statusText,
        ...patch,
      });
    },
    [onProgressChange, startedAt, outcome, statusText]
  );

  useEffect(() => {
    persist({});
  }, [fen, outcome, statusText, persist]);

  type Snapshot = {
    fen: string;
    outcome: Outcome;
    statusText: string;
    frozenElapsedMs: number;
  };

  const getSnapshot = useCallback(
    (): Snapshot => ({
      fen: gameRef.current.fen(),
      outcome,
      statusText,
      frozenElapsedMs,
    }),
    [outcome, statusText, frozenElapsedMs]
  );

  const applySnapshot = useCallback((snapshot: Snapshot) => {
    try {
      gameRef.current = new Chess(snapshot.fen);
    } catch {
      gameRef.current = new Chess();
    }
    setFen(snapshot.fen);
    setOutcome(snapshot.outcome);
    setStatusText(snapshot.statusText);
    setFrozenElapsedMs(snapshot.frozenElapsedMs);
    setMoveFrom(null);
  }, []);

  const historyEnabled =
    outcome === 'playing' ||
    outcome === 'draw' ||
    (outcome === 'lost' && isLocalDevHost());
  const { pushHistory, popHistory, undo, redo, canUndo, canRedo } = useUndoRedo(
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

  useEffect(() => {
    if (outcome !== 'playing') setMoveFrom(null);
  }, [outcome]);

  const finishWin = useCallback(
    (startAt: number | null) => {
      const start = startAt ?? Date.now();
      const elapsed = Math.max(1, Date.now() - start);
      setFrozenElapsedMs(elapsed);
      setOutcome('playing');
      setStatusText('Victory! Generating your code…');
      onWin(elapsed);
    },
    [onWin]
  );

  const tryPlayerMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (outcome !== 'playing') return false;

      const game = gameRef.current;
      if (game.turn() !== 'w') return false;

      let start = startedAt;
      if (!start) {
        start = Date.now();
        setStartedAt(start);
      }

      pushHistory();

      let move;
      try {
        move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });
      } catch {
        popHistory();
        return false;
      }
      if (!move) {
        popHistory();
        return false;
      }

      const nextFen = game.fen();
      setFen(nextFen);

      if (playerWon(game)) {
        finishWin(start);
        return true;
      }
      if (playerLost(game)) {
        const elapsed = start ? Math.max(1, Date.now() - start) : 0;
        const text = 'Checkmate! The computer wins. Try again.';
        setFrozenElapsedMs(elapsed);
        setOutcome('lost');
        setStatusText(text);
        persist({
          fen: nextFen,
          startedAt: start,
          outcome: 'lost',
          statusText: text,
        });
        return true;
      }
      if (game.isDraw()) {
        const elapsed = start ? Math.max(1, Date.now() - start) : 0;
        const text = 'Draw. Start over and go for checkmate.';
        setFrozenElapsedMs(elapsed);
        setOutcome('draw');
        setStatusText(text);
        persist({
          fen: nextFen,
          startedAt: start,
          outcome: 'draw',
          statusText: text,
        });
        return true;
      }

      pickBotMove(game);
      const afterBotFen = game.fen();
      setFen(afterBotFen);

      if (playerWon(game)) {
        finishWin(start);
        return true;
      }
      if (playerLost(game)) {
        const elapsed = start ? Math.max(1, Date.now() - start) : 0;
        const text = 'Checkmate! The computer wins. Try again.';
        setFrozenElapsedMs(elapsed);
        setOutcome('lost');
        setStatusText(text);
        persist({
          fen: afterBotFen,
          startedAt: start,
          outcome: 'lost',
          statusText: text,
        });
        return true;
      }
      if (game.isDraw()) {
        const elapsed = start ? Math.max(1, Date.now() - start) : 0;
        const text = 'Draw. Start over and go for checkmate.';
        setFrozenElapsedMs(elapsed);
        setOutcome('draw');
        setStatusText(text);
        persist({
          fen: afterBotFen,
          startedAt: start,
          outcome: 'draw',
          statusText: text,
        });
        return true;
      }

      persist({ fen: afterBotFen, startedAt: start, outcome: 'playing' });
      return true;
    },
    [finishWin, outcome, persist, pushHistory, popHistory, startedAt]
  );

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
      piece,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
      piece: { pieceType: string };
    }): boolean => {
      setMoveFrom(null);
      if (!targetSquare) return false;
      if (piece.pieceType[0] !== 'w') return false;
      return tryPlayerMove(sourceSquare, targetSquare);
    },
    [tryPlayerMove]
  );

  const onSquareClick = useCallback(
    ({ piece, square }: SquareHandlerArgs) => {
      if (outcome !== 'playing') return;

      const game = gameRef.current;
      if (game.turn() !== 'w') return;

      if (moveFrom) {
        if (moveFrom === square) {
          setMoveFrom(null);
          return;
        }

        const legalTargets = game
          .moves({ square: moveFrom, verbose: true })
          .map((move: Move) => move.to);
        if (legalTargets.includes(square as Square)) {
          setMoveFrom(null);
          tryPlayerMove(moveFrom, square);
          return;
        }
      }

      if (piece?.pieceType[0] === 'w') {
        setMoveFrom(square as Square);
        return;
      }

      setMoveFrom(null);
    },
    [moveFrom, outcome, tryPlayerMove]
  );

  const onPieceDrag = useCallback(
    ({ isSparePiece, piece, square }: PieceHandlerArgs) => {
      if (outcome !== 'playing' || isSparePiece || !square) return;
      if (piece.pieceType[0] === 'w' && gameRef.current.turn() === 'w') {
        setMoveFrom(square as Square);
      }
    },
    [outcome]
  );

  const squareStyles = useMemo(
    () =>
      outcome === 'playing' && moveFrom
        ? getMoveSquareStyles(gameRef.current, moveFrom)
        : {},
    [fen, moveFrom, outcome]
  );

  const boardOptions = useMemo(
    () => ({
      position: fen,
      boardOrientation: 'white' as const,
      allowDragging: outcome === 'playing',
      onPieceDrop,
      onSquareClick,
      onPieceDrag,
      squareStyles,
      canDragPiece: ({ piece }: { piece: { pieceType: string } }) =>
        outcome === 'playing' &&
        gameRef.current.turn() === 'w' &&
        piece.pieceType[0] === 'w',
      darkSquareStyle: { backgroundColor: 'var(--chess-dark)' },
      lightSquareStyle: { backgroundColor: 'var(--chess-light)' },
      dropSquareStyle: { backgroundColor: 'var(--chess-selected)' },
      boardStyle: {
        borderRadius: '8px',
        border: '1px solid var(--chess-border)',
        boxShadow: 'var(--shadow-chess-board)',
      },
    }),
    [fen, onPieceDrop, onSquareClick, onPieceDrag, outcome, squareStyles]
  );

  return (
    <div className="chess-wrap">
      <p className="timer">Time: {formatDuration(elapsedMs)}</p>
      {statusText && <p className="timer">{statusText}</p>}
      <Chessboard options={boardOptions} />
    </div>
  );
}
