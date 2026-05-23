import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChessMatch } from '../components/ChessMatch';
import { DevSkipButton } from '../components/DevSkipButton';
import { Layout } from '../components/Layout';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { ResendCodeButton } from '../components/ResendCodeButton';
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
  const {
    status,
    message,
    code,
    offerText,
    redeem,
    resetRedeem,
    resendCode,
    resendBusy,
    resendNotice,
    devComplete,
    devSkipBusy,
  } = useRedeemSession();
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
            <DevSkipButton
              disabled={devSkipBusy}
              onClick={() => {
                const ms =
                  savedChess?.startedAt != null
                    ? Math.max(1, Date.now() - savedChess.startedAt)
                    : 1000;
                void devComplete(ms, 1);
              }}
            />
            <StartOverButton onClick={handleStartOver} />
          </>
        ) : (
          <PuzzleComplete
            status={status}
            message={message}
            code={code}
            offerText={offerText}
            footer={
              <>
                {status === 'done' ? (
                  <ResendCodeButton
                    onClick={() => void resendCode()}
                    disabled={resendBusy}
                    notice={resendNotice}
                  />
                ) : null}
                <StartOverButton onClick={handleStartOver} />
              </>
            }
          />
        )}
      </div>
    </Layout>
  );
}
