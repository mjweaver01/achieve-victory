import { Chess, type Square } from 'chess.js';
import type { CSSProperties } from 'react';

export type ChessGameStatus =
  | { kind: 'playing' }
  | { kind: 'check' }
  | {
      kind: 'checkmate';
      winner: 'white' | 'black';
      moveSan: string;
    }
  | { kind: 'draw'; reason: string };

export type LastMove = {
  from: Square;
  to: Square;
  san: string;
};

export function findKingSquare(game: Chess, color: 'w' | 'b'): Square | null {
  const board = game.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row]?.[col];
      if (piece?.type === 'k' && piece.color === color) {
        const file = String.fromCharCode(97 + col);
        const rank = 8 - row;
        return `${file}${rank}` as Square;
      }
    }
  }
  return null;
}

export function getLastMove(game: Chess): LastMove | null {
  const history = game.history({ verbose: true });
  const last = history[history.length - 1];
  if (!last) return null;
  return {
    from: last.from as Square,
    to: last.to as Square,
    san: last.san,
  };
}

export function getChessGameStatus(game: Chess): ChessGameStatus {
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'black' : 'white';
    const moveSan = game.history().at(-1) ?? '';
    return { kind: 'checkmate', winner, moveSan };
  }
  if (game.isStalemate()) return { kind: 'draw', reason: 'Stalemate' };
  if (game.isInsufficientMaterial()) {
    return { kind: 'draw', reason: 'Insufficient material' };
  }
  if (game.isThreefoldRepetition()) {
    return { kind: 'draw', reason: 'Threefold repetition' };
  }
  if (game.isDrawByFiftyMoves()) {
    return { kind: 'draw', reason: 'Fifty-move rule' };
  }
  if (game.isDraw()) return { kind: 'draw', reason: 'Draw' };
  if (game.inCheck()) return { kind: 'check' };
  return { kind: 'playing' };
}

export function winnerLabel(winner: 'white' | 'black'): string {
  return winner === 'white' ? 'White' : 'Black';
}

export function getBoardSquareStyles(
  game: Chess,
  moveHints: Record<string, CSSProperties>
): Record<string, CSSProperties> {
  const styles: Record<string, CSSProperties> = {};

  const lastMove = getLastMove(game);
  if (lastMove) {
    styles[lastMove.from] = { backgroundColor: 'var(--chess-last-move-from)' };
    styles[lastMove.to] = { backgroundColor: 'var(--chess-last-move-to)' };
  }

  if (game.inCheck() || game.isCheckmate()) {
    const kingSquare = findKingSquare(game, game.turn());
    if (kingSquare) {
      styles[kingSquare] = {
        ...styles[kingSquare],
        background:
          'radial-gradient(ellipse at center, var(--chess-check-glow) 0%, transparent 72%)',
      };
    }
  }

  for (const [square, style] of Object.entries(moveHints)) {
    styles[square] = { ...styles[square], ...style };
  }

  return styles;
}
