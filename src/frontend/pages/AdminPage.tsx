import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layout } from '../components/Layout';
import type { AdminStatsResponse } from '../../types';
import { toEpochMs } from '../../utils/epoch';
import { useVirtualWindow } from '../utils/useVirtualWindow';
import { formatDuration } from '../utils/time';

const ADMIN_ROW_HEIGHT = 41;
const ADMIN_TABLE_COLUMNS = 3;

function formatDate(ts: number | string): string {
  const ms = toEpochMs(ts);
  if (ms <= 0) return '—';
  return new Date(ms).toLocaleString();
}

export function AdminPage() {
  const [key, setKey] = useState('');
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('key');
    if (fromUrl) {
      setKey(fromUrl);
    }
  }, []);

  async function load() {
    setError('');
    try {
      const res = await fetch(`/api/analytics?key=${encodeURIComponent(key)}`);
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

  const topCompletions = stats?.topCompletions ?? [];
  const { scrollRef, startIndex, endIndex, onScroll, scrollToTop } =
    useVirtualWindow({
      count: topCompletions.length,
      rowHeight: ADMIN_ROW_HEIGHT,
    });

  useEffect(() => {
    if (stats) scrollToTop();
  }, [stats, scrollToTop]);

  const virtualRows =
    endIndex >= startIndex ? topCompletions.slice(startIndex, endIndex + 1) : [];
  const topSpacerHeight = startIndex * ADMIN_ROW_HEIGHT;
  const bottomSpacerHeight =
    topCompletions.length > 0
      ? (topCompletions.length - endIndex - 1) * ADMIN_ROW_HEIGHT
      : 0;

  return (
    <Layout title="Analytics" subtitle="Internal stats — key required.">
      <div className="card">
        <input
          type="password"
          placeholder="Analytics key"
          value={key}
          onChange={e => setKey(e.target.value)}
        />
        <button className="primary" type="button" onClick={() => void load()}>
          Load tools
        </button>
        {error ? <p className="error">{error}</p> : null}
      </div>

      {stats ? (
        <>
          <div className="card card-stack">
            <p>Total plays: {stats.totalSessions}</p>
            <p>Codes issued: {stats.totalCodes}</p>
            <p>Completion rate: {(stats.completionRate * 100).toFixed(1)}%</p>
            <p>Drop-off (started, not finished): {stats.dropOffCount}</p>
            <p>Blocked email attempts: {stats.blockedAttempts}</p>
          </div>

          <div className="card card-stack">
            <h2>Codes per day</h2>
            <div className="chart">
              <ResponsiveContainer>
                <BarChart data={stats.codesByDay}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--chart-tick)', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--chart-bar)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card card-stack">
            <h2>Top completions</h2>
            <div
              ref={scrollRef}
              className="leaderboard-table-scroll"
              onScroll={onScroll}
            >
              <table className="leaderboard-table admin-completions-table">
                <colgroup>
                  <col className="admin-col-email" />
                  <col className="admin-col-time" />
                  <col className="admin-col-completed" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Time</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {topSpacerHeight > 0 ? (
                    <tr aria-hidden="true" className="leaderboard-spacer">
                      <td
                        colSpan={ADMIN_TABLE_COLUMNS}
                        style={{ height: topSpacerHeight }}
                      />
                    </tr>
                  ) : null}
                  {virtualRows.map((row, offset) => {
                    const index = startIndex + offset;
                    return (
                      <tr key={`${row.completedAt}-${row.completionTimeMs}-${index}`}>
                        <td>{row.email}</td>
                        <td>{formatDuration(row.completionTimeMs)}</td>
                        <td>{formatDate(row.completedAt)}</td>
                      </tr>
                    );
                  })}
                  {bottomSpacerHeight > 0 ? (
                    <tr aria-hidden="true" className="leaderboard-spacer">
                      <td
                        colSpan={ADMIN_TABLE_COLUMNS}
                        style={{ height: bottomSpacerHeight }}
                      />
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {topCompletions.length === 0 ? (
              <p className="subtitle leaderboard-empty">No completions yet.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </Layout>
  );
}
