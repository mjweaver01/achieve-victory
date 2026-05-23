import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { DevSkipButton } from '../components/DevSkipButton';
import { Layout } from '../components/Layout';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { ResendCodeButton } from '../components/ResendCodeButton';
import { SolitaireMatch } from '../components/SolitaireMatch';
import { StartOverButton } from '../components/StartOverButton';
import { useRedeemSession } from '../hooks/useRedeemSession';
import {
  clearGameState,
  loadProgress,
  saveSolitaireProgress,
  type SolitaireProgress,
} from '../utils/gameProgress';
import { gamePath, getStoredSession } from '../utils/session';

export function SolitairePage() {
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

  const savedSolitaire = useMemo(() => {
    if (!session || gameKey > 0) return undefined;
    return loadProgress(session.sessionId)?.solitaire;
  }, [session, gameKey]);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    if (session.game !== 'solitaire') {
      navigate(gamePath(session.game));
    }
  }, [navigate, session]);

  const handleProgress = useCallback(
    (progress: SolitaireProgress) => {
      if (session) saveSolitaireProgress(session.sessionId, progress);
    },
    [session]
  );

  const handleStartOver = useCallback(() => {
    if (!session) return;
    clearGameState(session.sessionId, 'solitaire');
    resetRedeem();
    setGameKey(k => k + 1);
  }, [session, resetRedeem]);

  if (!session) return null;

  return (
    <Layout
      title="Solitaire Showdown"
      subtitle="Klondike solitaire: move all cards to the foundations."
    >
      <div className="card">
        {status === 'playing' ? (
          <>
            <SolitaireMatch
              key={gameKey}
              saved={savedSolitaire}
              onWin={(ms, score) => void redeem(ms, score)}
              onProgressChange={handleProgress}
            />
            <DevSkipButton
              disabled={devSkipBusy}
              onClick={() => {
                const ms =
                  savedSolitaire?.startedAt != null
                    ? Math.max(1, Date.now() - savedSolitaire.startedAt)
                    : 1000;
                void devComplete(ms, savedSolitaire?.moves ?? 30);
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
              <div className="puzzle-complete-footer">
                {status === 'done' ? (
                  <ResendCodeButton
                    onClick={() => void resendCode()}
                    disabled={resendBusy}
                    notice={resendNotice}
                  />
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
