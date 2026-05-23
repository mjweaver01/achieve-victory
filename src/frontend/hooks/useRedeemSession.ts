import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { RedeemProgress } from '../../types/progress';
import { loadProgress, saveRedeemProgress } from '../utils/gameProgress';
import { getStoredSession } from '../utils/session';

type Status = RedeemProgress['status'];

function initialRedeem(sessionId: string | undefined): RedeemProgress {
  if (!sessionId) {
    return {
      status: 'playing',
      message: '',
      code: undefined,
      offerText: undefined,
      completionTimeMs: undefined,
    };
  }
  const saved = loadProgress(sessionId)?.redeem;
  return (
    saved ?? {
      status: 'playing',
      message: '',
      code: undefined,
      offerText: undefined,
      completionTimeMs: undefined,
    }
  );
}

export function useRedeemSession() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const sessionId = session?.sessionId;

  const [status, setStatus] = useState<Status>(
    () => initialRedeem(sessionId).status
  );
  const [message, setMessage] = useState(
    () => initialRedeem(sessionId).message
  );
  const [code, setCode] = useState(() => initialRedeem(sessionId).code ?? '');
  const [offerText, setOfferText] = useState(
    () => initialRedeem(sessionId).offerText ?? ''
  );
  const [completionTimeMs, setCompletionTimeMs] = useState<number | undefined>(
    () => initialRedeem(sessionId).completionTimeMs
  );
  const [devSkipBusy, setDevSkipBusy] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    saveRedeemProgress(sessionId, {
      status,
      message,
      code: code || undefined,
      offerText: offerText || undefined,
      completionTimeMs,
    });
  }, [sessionId, status, message, code, offerText, completionTimeMs]);

  const redeem = useCallback(
    async (completionTimeMs: number, score?: number) => {
      const current = getStoredSession();
      if (!current) {
        navigate('/');
        return;
      }

      setStatus('submitting');
      setMessage('');
      setCode('');
      setOfferText('');
      setCompletionTimeMs(undefined);
      try {
        const res = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: current.sessionId,
            email: current.email,
            game: current.game,
            completionTimeMs,
            score,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          code?: string;
          offerText?: string;
        };

        if (!res.ok) {
          setStatus('error');
          setCode(data.code ?? '');
          setOfferText(data.offerText ?? '');
          setMessage(data.error ?? 'Could not redeem reward');
          return;
        }

        setStatus('done');
        setCode(data.code ?? '');
        setOfferText(data.offerText ?? '');
        setCompletionTimeMs(completionTimeMs);
        setMessage('You did it! Your code:');
      } catch {
        setStatus('error');
        setMessage('Network error — try again.');
      }
    },
    [navigate]
  );

  const resetRedeem = useCallback(() => {
    setStatus('playing');
    setMessage('');
    setCode('');
    setOfferText('');
    setCompletionTimeMs(undefined);
  }, []);

  const devComplete = useCallback(
    async (completionTimeMs: number, score?: number) => {
      const current = getStoredSession();
      if (!current) return;

      setDevSkipBusy(true);
      setStatus('submitting');
      setMessage('');
      setCode('');
      setOfferText('');
      setCompletionTimeMs(undefined);
      try {
        const res = await fetch('/api/dev/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: current.sessionId,
            email: current.email,
            game: current.game,
            completionTimeMs: Math.max(1, completionTimeMs),
            score,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          code?: string;
          offerText?: string;
        };

        if (!res.ok) {
          setStatus('error');
          setCode(data.code ?? '');
          setOfferText(data.offerText ?? '');
          setMessage(data.error ?? 'Dev complete failed');
          return;
        }

        setStatus('done');
        setCode(data.code ?? '');
        setOfferText(data.offerText ?? '');
        setCompletionTimeMs(completionTimeMs);
        setMessage('You did it! Your code:');
      } catch {
        setStatus('error');
        setMessage('Network error — try again.');
      } finally {
        setDevSkipBusy(false);
      }
    },
    []
  );

  return {
    status,
    message,
    code,
    offerText,
    completionTimeMs,
    redeem,
    resetRedeem,
    devComplete,
    devSkipBusy,
  };
}
