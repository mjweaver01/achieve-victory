import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChessMatch } from '../components/ChessMatch';
import { GameToolbar, GameToolbarButton } from '../components/GameToolbar';
import { Layout } from '../components/Layout';
import { PuzzleComplete } from '../components/PuzzleComplete';
import { PrintDiscountCodeButton } from '../components/PrintDiscountCodeButton';
import { StartOverButton } from '../components/StartOverButton';
import { useRedeemSession } from '../hooks/useRedeemSession';
import type { UndoRedoActions } from '../hooks/useUndoRedo';
import type { ChessProgress } from '../../types/progress';
import {
  clearGameState,
  loadProgress,
  saveChessProgress,
} from '../utils/gameProgress';
import { gamePath, getStoredSession } from '../utils/session';

export function ChessPage() {
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
  const [undoRedo, setUndoRedo] = useState<UndoRedoActions | null>(null);

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
      navigate(gamePath(session.game));
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
            <GameToolbar
              onStartOver={handleStartOver}
              onDevSkip={() => {
                const ms =
                  savedChess?.startedAt != null
                    ? Math.max(1, Date.now() - savedChess.startedAt)
                    : 1000;
                void devComplete(ms, 1);
              }}
              devSkipBusy={devSkipBusy}
            >
              <GameToolbarButton
                onClick={() => undoRedo?.undo()}
                disabled={!undoRedo?.canUndo}
                aria-label="Undo"
              >
                Undo
              </GameToolbarButton>
              <GameToolbarButton
                onClick={() => undoRedo?.redo()}
                disabled={!undoRedo?.canRedo}
                aria-label="Redo"
              >
                Redo
              </GameToolbarButton>
            </GameToolbar>
            <ChessMatch
              key={gameKey}
              saved={savedChess}
              onWin={ms => void redeem(ms, 1)}
              onProgressChange={handleProgress}
              onUndoRedoReady={setUndoRedo}
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
