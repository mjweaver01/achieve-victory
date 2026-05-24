import { winnerLabel, type ChessGameStatus } from '../utils/chessStatus';

type Props = {
  status: ChessGameStatus;
};

export function ChessGameStatusPanel({ status }: Props) {
  if (status.kind === 'playing' || status.kind === 'check') return null;

  if (status.kind === 'draw') {
    return (
      <div className="chess-game-status chess-game-status--draw" role="status">
        <p className="chess-game-status__headline">{status.reason}</p>
      </div>
    );
  }

  return (
    <div className="chess-game-status chess-game-status--mate" role="status">
      <p className="chess-game-status__headline">Checkmate</p>
      <p className="chess-game-status__result">
        {winnerLabel(status.winner)} wins
      </p>
      {status.moveSan ? (
        <p className="chess-game-status__move">{status.moveSan}</p>
      ) : null}
    </div>
  );
}
