import { Chess } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useElapsedTimer } from '../hooks/useElapsedTimer';
import type { ChessProgress } from '../utils/gameProgress';
import { formatDuration } from '../utils/time';

type Outcome = ChessProgress['outcome'];

const DEFAULT_STATUS = '';

type Props = {
  saved?: ChessProgress;
  onWin: (elapsedMs: number) => void;
  onProgressChange: (progress: ChessProgress) => void;
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

export function ChessMatch({ saved, onWin, onProgressChange }: Props) {
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
      if (outcome !== 'playing' || !targetSquare) return false;

      const game = gameRef.current;
      if (game.turn() !== 'w' || piece.pieceType[0] !== 'w') return false;

      let start = startedAt;
      if (!start) {
        start = Date.now();
        setStartedAt(start);
      }

      let move;
      try {
        move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });
      } catch {
        return false;
      }
      if (!move) return false;

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
    [finishWin, outcome, persist]
  );

  const boardOptions = useMemo(
    () => ({
      position: fen,
      boardOrientation: 'white' as const,
      allowDragging: outcome === 'playing',
      onPieceDrop,
      canDragPiece: ({ piece }: { piece: { pieceType: string } }) =>
        outcome === 'playing' &&
        gameRef.current.turn() === 'w' &&
        piece.pieceType[0] === 'w',
      darkSquareStyle: { backgroundColor: '#1a1a1a' },
      lightSquareStyle: { backgroundColor: '#2e2e2e' },
      boardStyle: {
        borderRadius: '8px',
        border: '1px solid #2a2a2a',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
      },
    }),
    [fen, onPieceDrop, outcome]
  );

  return (
    <div className="chess-wrap">
      <p className="timer">Time: {formatDuration(elapsedMs)}</p>
      {statusText && <p className="timer">{statusText}</p>}
      <Chessboard options={boardOptions} />
    </div>
  );
}
