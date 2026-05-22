import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  loadProgress,
  saveRedeemProgress,
  type RedeemProgress,
} from '../utils/gameProgress';
import { getStoredSession } from '../utils/session';

type Status = RedeemProgress['status'];

function initialRedeem(sessionId: string | undefined): RedeemProgress {
  if (!sessionId) return { status: 'playing', message: '' };
  const saved = loadProgress(sessionId)?.redeem;
  return saved ?? { status: 'playing', message: '' };
}

export function useRedeemSession() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const sessionId = session?.sessionId;

  const [status, setStatus] = useState<Status>(() =>
    initialRedeem(sessionId).status
  );
  const [message, setMessage] = useState(
    () => initialRedeem(sessionId).message
  );

  useEffect(() => {
    if (!sessionId) return;
    saveRedeemProgress(sessionId, { status, message });
  }, [sessionId, status, message]);

  const redeem = useCallback(
    async (completionTimeMs: number, score?: number) => {
      const current = getStoredSession();
      if (!current) {
        navigate('/');
        return;
      }

      setStatus('submitting');
      setMessage('');
      try {
        const res = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: current.sessionId,
            email: current.email,
            completionTimeMs,
            score,
          }),
        });
        const data = (await res.json()) as { error?: string };

        if (!res.ok) {
          setStatus('error');
          setMessage(data.error ?? 'Could not redeem reward');
          return;
        }

        setStatus('done');
        setMessage('Check your inbox for your discount code.');
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
  }, []);

  return { status, message, redeem, resetRedeem };
}
