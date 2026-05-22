import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { SlidingPuzzle } from '../components/SlidingPuzzle';
import { useRedeemSession } from '../hooks/useRedeemSession';
import { getStoredSession } from '../utils/session';

export function PuzzlePage() {
  const navigate = useNavigate();
  const { status, message, redeem } = useRedeemSession();

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      navigate('/');
      return;
    }
    if (session.game !== 'puzzle') {
      navigate(`/play/${session.game}`);
    }
  }, [navigate]);

  return (
    <Layout
      title="Slide to Victory"
      subtitle="Arrange the tiles in order. Any completion earns your code."
    >
      <div className="card">
        {status === 'playing' ? (
          <SlidingPuzzle onComplete={ms => void redeem(ms)} />
        ) : null}
        {status === 'submitting' ? <p>Sending your code…</p> : null}
        {status === 'done' || status === 'error' ? (
          <p className={status === 'error' ? 'error' : undefined}>{message}</p>
        ) : null}
      </div>
    </Layout>
  );
}
