import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChessMatch } from '../components/ChessMatch';
import { Layout } from '../components/Layout';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { StartOverButton } from '../components/StartOverButton';
import { useRedeemSession } from '../hooks/useRedeemSession';
import {
  clearGameState,
  loadProgress,
  saveChessProgress,
  type ChessProgress,
} from '../utils/gameProgress';
import { getStoredSession } from '../utils/session';

export function ChessPage() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const { status, message, redeem, resetRedeem } = useRedeemSession();
  const [gameKey, setGameKey] = useState(0);

  const savedChess = useMemo(() => {
    if (!session || gameKey > 0) return undefined;
    return loadProgress(session.sessionId)?.chess;
  }, [session, gameKey]);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    if (session.game !== 'chess') {
      navigate(`/play/${session.game}`);
    }
  }, [navigate, session]);

  const handleProgress = useCallback(
    (progress: ChessProgress) => {
      if (session) saveChessProgress(session.sessionId, progress);
    },
    [session]
  );

  const handleStartOver = useCallback(() => {
    if (!session) return;
    clearGameState(session.sessionId, 'chess');
    resetRedeem();
    setGameKey(k => k + 1);
  }, [session, resetRedeem]);

  if (!session) return null;

  return (
    <Layout
      title="Chess Challenge"
      subtitle="You play white. Win by checkmate to earn your discount code."
    >
      <div className="card">
        {status === 'playing' ? (
          <>
            <ChessMatch
              key={gameKey}
              saved={savedChess}
              onWin={ms => void redeem(ms, 1)}
              onProgressChange={handleProgress}
            />
            <StartOverButton onClick={handleStartOver} />
          </>
        ) : (
          <PuzzleComplete
            status={status}
            message={message}
            footer={<StartOverButton onClick={handleStartOver} />}
          />
        )}
      </div>
    </Layout>
  );
}
