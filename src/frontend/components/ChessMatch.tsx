import { Chess } from 'chess.js';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';

type Outcome = 'playing' | 'won' | 'lost' | 'draw';

type Props = {
  onWin: (elapsedMs: number) => void;
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

export function ChessMatch({ onWin }: Props) {
  const gameRef = useRef(new Chess());
  const startedAtRef = useRef<number | null>(null);
  const [fen, setFen] = useState(gameRef.current.fen());
  const [outcome, setOutcome] = useState<Outcome>('playing');
  const [statusText, setStatusText] = useState(
    'You play white. Checkmate the computer to win your code.'
  );

  const reset = useCallback(() => {
    gameRef.current = new Chess();
    startedAtRef.current = null;
    setFen(gameRef.current.fen());
    setOutcome('playing');
    setStatusText(
      'You play white. Checkmate the computer to win your code.'
    );
  }, []);

  const finishWin = useCallback(() => {
    const start = startedAtRef.current ?? Date.now();
    const elapsed = Math.max(1, Date.now() - start);
    setOutcome('won');
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

      setFen(game.fen());

      if (playerWon(game)) {
        finishWin();
        return true;
      }
      if (playerLost(game)) {
        setOutcome('lost');
        setStatusText('Checkmate — the computer wins. Try again.');
        return true;
      }
      if (game.isDraw()) {
        setOutcome('draw');
        setStatusText('Draw. Reset and go for checkmate.');
        return true;
      }

      pickBotMove(game);
      setFen(game.fen());

      if (playerWon(game)) {
        finishWin();
        return true;
      }
      if (playerLost(game)) {
        setOutcome('lost');
        setStatusText('Checkmate — the computer wins. Try again.');
        return true;
      }
      if (game.isDraw()) {
        setOutcome('draw');
        setStatusText('Draw. Reset and go for checkmate.');
        return true;
      }

      return true;
    },
    [finishWin, outcome]
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
      darkSquareStyle: { backgroundColor: '#2a1f5c' },
      lightSquareStyle: { backgroundColor: '#4b3aa8' },
      boardStyle: {
        borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      },
    }),
    [fen, onPieceDrop, outcome]
  );

  return (
    <div className="chess-wrap">
      <p className="timer">{statusText}</p>
      <Chessboard options={boardOptions} />
      {outcome === 'lost' || outcome === 'draw' ? (
        <button type="button" className="primary" onClick={reset}>
          Play again
        </button>
      ) : null}
    </div>
  );
}
