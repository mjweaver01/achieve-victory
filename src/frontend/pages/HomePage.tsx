import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import type { StartResponse } from '../../types/api';
import {
  gamePath,
  getLastEmail,
  storeSession,
  type GameType,
} from '../utils/session';

export function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => getLastEmail());
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
        body: JSON.stringify({ email, game }),
      });
      const data = (await res.json()) as StartResponse & { error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Could not start session');
        return;
      }

      if ('sessionId' in data) {
        const normalized = email.trim().toLowerCase();
        storeSession(data.sessionId, normalized, game);
        navigate(gamePath(game));
      }
    } catch {
      setError('Network error — try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout
      title="ACHIEVE VICTORY"
      subtitle="Enter your email, pick a game, and earn your discount code."
    >
      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <p className="field-label">Choose your game</p>
          <div className="game-picker">
            <label className="game-picker-option">
              <input
                type="radio"
                name="game"
                value="puzzle"
                checked={game === 'puzzle'}
                onChange={() => setGame('puzzle')}
              />
              <img
                src="/images/g1.png"
                alt=""
                className="game-picker-icon"
                width={1000}
                height={1000}
              />
              <span className="game-picker-title">Image puzzle</span>
              <span className="game-picker-desc">
                Slide the tiles, any solution wins
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
              <img
                src="/images/g2.png"
                alt=""
                className="game-picker-icon"
                width={1000}
                height={1000}
              />
              <span className="game-picker-title">Chess</span>
              <span className="game-picker-desc">
                Beat the computer by checkmate
              </span>
            </label>
            <label className="game-picker-option">
              <input
                type="radio"
                name="game"
                value="solitaire"
                checked={game === 'solitaire'}
                onChange={() => setGame('solitaire')}
              />
              <img
                src="/images/g3.png"
                alt=""
                className="game-picker-icon"
                width={1000}
                height={1000}
              />
              <span className="game-picker-title">Solitaire</span>
              <span className="game-picker-desc">
                Aces Up: clear cards until only four remain
              </span>
            </label>
            <label className="game-picker-option">
              <input
                type="radio"
                name="game"
                value="game2048"
                checked={game === 'game2048'}
                onChange={() => setGame('game2048')}
              />
              <img
                src="/images/g4.png"
                alt=""
                className="game-picker-icon"
                width={1000}
                height={1000}
              />
              <span className="game-picker-title">2048</span>
              <span className="game-picker-desc">
                Merge tiles and reach 2048
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
