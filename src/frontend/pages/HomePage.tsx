import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import type { StartResponse } from '../../types/api';

const SESSION_KEY = 'madeon_session';

export function getStoredSession(): {
  sessionId: string;
  email: string;
} | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { sessionId: string; email: string };
  } catch {
    return null;
  }
}

export function storeSession(sessionId: string, email: string) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ sessionId, email })
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
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
        storeSession(data.sessionId, email.trim().toLowerCase());
        navigate('/play');
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
      subtitle="Enter your email, solve the puzzle, get your discount code."
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
          {error ? <p className="error">{error}</p> : null}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Starting…' : 'Play'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
