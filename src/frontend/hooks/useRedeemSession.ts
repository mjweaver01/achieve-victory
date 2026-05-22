import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { getStoredSession } from '../utils/session';

type Status = 'playing' | 'submitting' | 'done' | 'error';

export function useRedeemSession() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('playing');
  const [message, setMessage] = useState('');

  const redeem = useCallback(
    async (completionTimeMs: number, score?: number) => {
      const session = getStoredSession();
      if (!session) {
        navigate('/');
        return;
      }

      setStatus('submitting');
      try {
        const res = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            email: session.email,
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

  return { status, message, redeem, setStatus, setMessage };
}
