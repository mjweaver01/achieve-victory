import { useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layout } from '../components/Layout';
import type { AdminStatsResponse } from '../../types/api';

export function AdminPage() {
  const [key, setKey] = useState('');
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(key)}`);
      const data = (await res.json()) as AdminStatsResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Unauthorized');
        setStats(null);
        return;
      }
      setStats(data);
    } catch {
      setError('Network error');
    }
  }

  return (
    <Layout title="Admin" subtitle="Internal stats — key required.">
      <div className="card">
        <input
          type="password"
          placeholder="Admin secret"
          value={key}
          onChange={e => setKey(e.target.value)}
        />
        <button className="primary" type="button" onClick={() => void load()}>
          Load stats
        </button>
        {error ? <p className="error">{error}</p> : null}
      </div>

      {stats ? (
        <>
          <div className="card card-stack">
            <p>Total plays: {stats.totalSessions}</p>
            <p>Codes issued: {stats.totalCodes}</p>
            <p>
              Completion rate: {(stats.completionRate * 100).toFixed(1)}%
            </p>
            <p>Drop-off (started, not finished): {stats.dropOffCount}</p>
            <p>Blocked email attempts: {stats.blockedAttempts}</p>
          </div>

          <div className="card card-stack">
            <h2>Codes per day</h2>
            <div className="chart">
              <ResponsiveContainer>
                <BarChart data={stats.codesByDay}>
                  <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#e11d48" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card card-stack">
            <h2>Top completions</h2>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Time</th>
                  <th>Code</th>
                </tr>
              </thead>
              <tbody>
                {stats.topCompletions.map(row => (
                  <tr key={row.email}>
                    <td>{row.email}</td>
                    <td>{(row.completionTimeMs / 1000).toFixed(1)}s</td>
                    <td>{row.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </Layout>
  );
}
