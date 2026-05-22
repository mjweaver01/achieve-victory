import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import type { StartResponse } from '../../types/api';
import {
  storeSession,
  type GameType,
} from '../utils/session';

export function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [game, setGame] = useState<GameType>('puzzle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as StartResponse & { error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Could not start session');
        return;
      }

      if ('alreadyRedeemed' in data && data.alreadyRedeemed) {
        setError(`You already have a code: ${data.code}`);
        return;
      }

      if ('sessionId' in data) {
        const normalized = email.trim().toLowerCase();
        storeSession(data.sessionId, normalized, game);
        navigate(`/play/${game}`);
      }
    } catch {
      setError('Network error — try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout
      title="Victory Game"
      subtitle="Enter your email, pick a game, and earn your discount code."
    >
      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <p className="game-picker-label">Choose your game</p>
          <div className="game-picker">
            <label className="game-picker-option">
              <input
                type="radio"
                name="game"
                value="puzzle"
                checked={game === 'puzzle'}
                onChange={() => setGame('puzzle')}
              />
              <span className="game-picker-title">Image puzzle</span>
              <span className="game-picker-desc">
                Slide the tiles — any solve wins
              </span>
            </label>
            <label className="game-picker-option">
              <input
                type="radio"
                name="game"
                value="chess"
                checked={game === 'chess'}
                onChange={() => setGame('chess')}
              />
              <span className="game-picker-title">Chess</span>
              <span className="game-picker-desc">
                Beat the computer by checkmate
              </span>
            </label>
          </div>

          {error ? <p className="error">{error}</p> : null}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Starting…' : 'Play'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
