import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { GameToolbar } from '../components/GameToolbar';
import { Game2048 } from '../components/Game2048';
import { Layout } from '../components/Layout';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { PrintDiscountCodeButton } from '../components/PrintDiscountCodeButton';
import { StartOverButton } from '../components/StartOverButton';
import { useRedeemSession } from '../hooks/useRedeemSession';
import {
  clearGameState,
  loadProgress,
  save2048Progress,
  type Game2048Progress,
} from '../utils/gameProgress';
import { gamePath, getStoredSession } from '../utils/session';

export function Game2048Page() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const {
    status,
    message,
    code,
    offerText,
    completionTimeMs,
    redeem,
    resetRedeem,
    devComplete,
    devSkipBusy,
  } = useRedeemSession();
  const [gameKey, setGameKey] = useState(0);

  const savedGame = useMemo(() => {
    if (!session || gameKey > 0) return undefined;
    return loadProgress(session.sessionId)?.game2048;
  }, [session, gameKey]);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    if (session.game !== 'game2048') {
      navigate(gamePath(session.game));
    }
  }, [navigate, session]);

  const handleProgress = useCallback(
    (progress: Game2048Progress) => {
      if (session) save2048Progress(session.sessionId, progress);
    },
    [session]
  );

  const handleStartOver = useCallback(() => {
    if (!session) return;
    clearGameState(session.sessionId, 'game2048');
    resetRedeem();
    setGameKey(k => k + 1);
  }, [session, resetRedeem]);

  if (!session) return null;

  return (
    <Layout
      title="2048 Rush"
      subtitle="Merge matching tiles and reach 2048 to earn your code."
    >
      <div className="card">
        {status === 'playing' ? (
          <>
            <GameToolbar
              onStartOver={handleStartOver}
              onDevSkip={() => {
                const ms =
                  savedGame?.startedAt != null
                    ? Math.max(1, Date.now() - savedGame.startedAt)
                    : 1000;
                void devComplete(ms, savedGame?.score ?? 2048);
              }}
              devSkipBusy={devSkipBusy}
            />
            <Game2048
              key={gameKey}
              saved={savedGame}
              onWin={(ms, score) => void redeem(ms, score)}
              onProgressChange={handleProgress}
            />
          </>
        ) : (
          <PuzzleComplete
            status={status}
            message={message}
            code={code}
            offerText={offerText}
            timeMs={completionTimeMs}
            footer={
              <div className="puzzle-complete-footer">
                {status === 'done' && code ? (
                  <PrintDiscountCodeButton code={code} offerText={offerText} />
                ) : null}
                <StartOverButton onClick={handleStartOver} />
              </div>
            }
          />
        )}
      </div>
    </Layout>
  );
}
