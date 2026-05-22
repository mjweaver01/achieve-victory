import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import type { LeaderboardResponse } from '../../types/api';

function formatTime(ms: number): string {
  const sec = ms / 1000;
  return `${sec.toFixed(1)}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardResponse['entries']>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/leaderboard');
      const data = (await res.json()) as LeaderboardResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Failed to load');
        return;
      }
      setEntries(data.entries);
    } catch {
      setError('Network error');
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout title="Leaderboard" subtitle="Fastest completions. Refreshes every minute.">
      <div className="card">
        {error ? <p className="error">{error}</p> : null}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Time</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(row => (
              <tr key={`${row.rank}-${row.email}`}>
                <td>{row.rank}</td>
                <td>{row.email}</td>
                <td>{formatTime(row.completionTimeMs)}</td>
                <td>{formatDate(row.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && !error ? (
          <p className="subtitle">No completions yet — be the first.</p>
        ) : null}
      </div>
    </Layout>
  );
}
