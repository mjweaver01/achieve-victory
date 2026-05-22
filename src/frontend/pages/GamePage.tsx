import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { SlidingPuzzle } from '../components/SlidingPuzzle';
import { getStoredSession } from './HomePage';

export function GamePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'playing' | 'submitting' | 'done' | 'error'>(
    'playing'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!getStoredSession()) {
      navigate('/');
    }
  }, [navigate]);

  async function handleComplete(completionTimeMs: number) {
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
  }

  return (
    <Layout
      title="Slide to Victory"
      subtitle="Arrange the tiles in order. Any completion earns your code."
    >
      <div className="card">
        {status === 'playing' ? (
          <SlidingPuzzle onComplete={handleComplete} />
        ) : null}
        {status === 'submitting' ? <p>Sending your code…</p> : null}
        {status === 'done' || status === 'error' ? (
          <p className={status === 'error' ? 'error' : undefined}>{message}</p>
        ) : null}
      </div>
    </Layout>
  );
}
