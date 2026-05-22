import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChessMatch } from '../components/ChessMatch';
import { Layout } from '../components/Layout';
import { useRedeemSession } from '../hooks/useRedeemSession';
import { getStoredSession } from '../utils/session';

export function ChessPage() {
  const navigate = useNavigate();
  const { status, message, redeem } = useRedeemSession();

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      navigate('/');
      return;
    }
    if (session.game !== 'chess') {
      navigate(`/play/${session.game}`);
    }
  }, [navigate]);

  return (
    <Layout
      title="Chess Challenge"
      subtitle="You play white. Win by checkmate to earn your discount code."
    >
      <div className="card">
        {status === 'playing' ? (
          <ChessMatch onWin={ms => void redeem(ms, 1)} />
        ) : null}
        {status === 'submitting' ? <p>Sending your code…</p> : null}
        {status === 'done' || status === 'error' ? (
          <p className={status === 'error' ? 'error' : undefined}>{message}</p>
        ) : null}
      </div>
    </Layout>
  );
}
