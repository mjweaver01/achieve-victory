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
  if (!sessionId) {
    return {
      status: 'playing',
      message: '',
      code: undefined,
      offerText: undefined,
    };
  }
  const saved = loadProgress(sessionId)?.redeem;
  return (
    saved ?? {
      status: 'playing',
      message: '',
      code: undefined,
      offerText: undefined,
    }
  );
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
  const [code, setCode] = useState(() => initialRedeem(sessionId).code ?? '');
  const [offerText, setOfferText] = useState(
    () => initialRedeem(sessionId).offerText ?? ''
  );
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [devSkipBusy, setDevSkipBusy] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    saveRedeemProgress(sessionId, {
      status,
      message,
      code: code || undefined,
      offerText: offerText || undefined,
    });
  }, [sessionId, status, message, code, offerText]);

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
    setCode('');
    setOfferText('');
    setResendNotice('');
  }, []);

  const resendCode = useCallback(async () => {
    const current = getStoredSession();
    if (!current || status !== 'done') return;

    setResendBusy(true);
    setResendNotice('');
    try {
      const res = await fetch('/api/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: current.sessionId,
          email: current.email,
        }),
      });
      const data = (await res.json()) as { error?: string; mock?: boolean };

      if (!res.ok) {
        setResendNotice(data.error ?? 'Could not resend email');
        return;
      }

      setResendNotice(
        data.mock
          ? 'Development mode — email not sent. Your code was logged in the server terminal.'
          : 'Email sent again. Check your inbox.'
      );
    } catch {
      setResendNotice('Network error — try again.');
    } finally {
      setResendBusy(false);
    }
  }, [status]);

  const devComplete = useCallback(
    async (completionTimeMs: number, score?: number) => {
      const current = getStoredSession();
      if (!current) return;

      setDevSkipBusy(true);
      setStatus('submitting');
      setMessage('');
      setCode('');
      setOfferText('');
      try {
        const res = await fetch('/api/dev/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: current.sessionId,
            email: current.email,
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
        setMessage('Check your inbox for your discount code.');
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
    redeem,
    resetRedeem,
    resendCode,
    resendBusy,
    resendNotice,
    devComplete,
    devSkipBusy,
  };
}
