import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import type { GameType, StartResponse } from '../../types';
import { gamePath, getLastEmail, storeSession } from '../utils/session';

export function HomePage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState(() => getLastEmail());
  const [game, setGame] = useState<GameType>('puzzle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function startGame(selectedGame: GameType) {
    if (loading) return;

    setGame(selectedGame);

    const form = formRef.current;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, game: selectedGame }),
      });
      const data = (await res.json()) as StartResponse & { error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Could not start session');
        return;
      }

      if ('sessionId' in data) {
        const normalized = email.trim().toLowerCase();
        storeSession(data.sessionId, normalized, selectedGame);
        navigate(gamePath(selectedGame));
      }
    } catch {
      setError('Network error! Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void startGame(game);
  }

  const lastTapRef = useRef<{ game: GameType; time: number } | null>(null);

  const useDoubleTap = useCallback(
    (selectedGame: GameType) => ({
      onDoubleClick: () => void startGame(selectedGame),
      onTouchEnd: (e: React.TouchEvent) => {
        const now = Date.now();
        const last = lastTapRef.current;
        if (last?.game === selectedGame && now - last.time < 300) {
          e.preventDefault();
          lastTapRef.current = null;
          void startGame(selectedGame);
        } else {
          lastTapRef.current = { game: selectedGame, time: now };
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading]
  );

  return (
    <Layout
      title="ACHIEVE VICTORY"
      subtitle="Enter your email, pick a game, and earn a discount code!"
    >
      <div className="card">
        <form ref={formRef} onSubmit={handleSubmit}>
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
            <label
              className="game-picker-option"
              {...useDoubleTap('puzzle')}
            >
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
            <label
              className="game-picker-option"
              {...useDoubleTap('chess')}
            >
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
            <label
              className="game-picker-option"
              {...useDoubleTap('solitaire')}
            >
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
            <label
              className="game-picker-option"
              {...useDoubleTap('game2048')}
            >
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
