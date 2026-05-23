import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { SlidingPuzzle } from '../components/SlidingPuzzle';
import { DevSkipButton } from '../components/DevSkipButton';
import { PrintDiscountCodeButton } from '../components/PrintDiscountCodeButton';
import { StartOverButton } from '../components/StartOverButton';
import { useRedeemSession } from '../hooks/useRedeemSession';
import {
  clearGameState,
  loadProgress,
  savePuzzleProgress,
  type PuzzleProgress,
} from '../utils/gameProgress';
import { gamePath, getStoredSession } from '../utils/session';

export function PuzzlePage() {
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

  const savedPuzzle = useMemo(() => {
    if (!session || gameKey > 0) return undefined;
    return loadProgress(session.sessionId)?.puzzle;
  }, [session, gameKey]);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    if (session.game !== 'puzzle') {
      navigate(gamePath(session.game));
    }
  }, [navigate, session]);

  const handleProgress = useCallback(
    (progress: PuzzleProgress) => {
      if (session) savePuzzleProgress(session.sessionId, progress);
    },
    [session]
  );

  const handleStartOver = useCallback(() => {
    if (!session) return;
    clearGameState(session.sessionId, 'puzzle');
    resetRedeem();
    setGameKey(k => k + 1);
  }, [session, resetRedeem]);

  if (!session) return null;

  return (
    <Layout
      title="Slide to Victory"
      subtitle="Arrange the tiles in order. Any completion earns your code."
    >
      <div className="card">
        {status === 'playing' ? (
          <>
            <SlidingPuzzle
              key={gameKey}
              saved={savedPuzzle}
              shouldResumeComplete={
                status === 'playing' && Boolean(savedPuzzle?.done)
              }
              onComplete={ms => void redeem(ms)}
              onProgressChange={handleProgress}
            />
            <DevSkipButton
              disabled={devSkipBusy}
              onClick={() => {
                const ms =
                  savedPuzzle?.elapsedMs ??
                  (savedPuzzle?.startedAt
                    ? Date.now() - savedPuzzle.startedAt
                    : 1000);
                void devComplete(ms);
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
