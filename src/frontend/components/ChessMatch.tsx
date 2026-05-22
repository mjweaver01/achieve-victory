import { Chess } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { ChessProgress } from '../utils/gameProgress';

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
  const startedAtRef = useRef<number | null>(saved?.startedAt ?? null);
  const [fen, setFen] = useState(gameRef.current.fen());
  const [outcome, setOutcome] = useState<Outcome>(saved?.outcome ?? 'playing');
  const [statusText, setStatusText] = useState(
    saved?.statusText ?? DEFAULT_STATUS
  );

  const persist = useCallback(
    (patch: Partial<ChessProgress>) => {
      onProgressChange({
        fen: gameRef.current.fen(),
        startedAt: startedAtRef.current,
        outcome,
        statusText,
        ...patch,
      });
    },
    [onProgressChange, outcome, statusText]
  );

  useEffect(() => {
    persist({});
  }, [fen, outcome, statusText, persist]);

  const finishWin = useCallback(() => {
    const start = startedAtRef.current ?? Date.now();
    const elapsed = Math.max(1, Date.now() - start);
    setOutcome('playing');
    setStatusText('Victory! Sending your code…');
    onWin(elapsed);
  }, [onWin]);

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

      if (!startedAtRef.current) startedAtRef.current = Date.now();

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
        finishWin();
        return true;
      }
      if (playerLost(game)) {
        const text = 'Checkmate! The computer wins. Try again.';
        setOutcome('lost');
        setStatusText(text);
        persist({ fen: nextFen, outcome: 'lost', statusText: text });
        return true;
      }
      if (game.isDraw()) {
        const text = 'Draw. Start over and go for checkmate.';
        setOutcome('draw');
        setStatusText(text);
        persist({ fen: nextFen, outcome: 'draw', statusText: text });
        return true;
      }

      pickBotMove(game);
      const afterBotFen = game.fen();
      setFen(afterBotFen);

      if (playerWon(game)) {
        finishWin();
        return true;
      }
      if (playerLost(game)) {
        const text = 'Checkmate! The computer wins. Try again.';
        setOutcome('lost');
        setStatusText(text);
        persist({ fen: afterBotFen, outcome: 'lost', statusText: text });
        return true;
      }
      if (game.isDraw()) {
        const text = 'Draw. Start over and go for checkmate.';
        setOutcome('draw');
        setStatusText(text);
        persist({ fen: afterBotFen, outcome: 'draw', statusText: text });
        return true;
      }

      persist({ fen: afterBotFen, outcome: 'playing' });
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
      {statusText && <p className="timer">{statusText}</p>}
      <Chessboard options={boardOptions} />
    </div>
  );
}
