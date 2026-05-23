import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import type { GameType, LeaderboardResponse } from '../../types/api';
import { toEpochMs } from '../../utils/epoch';
import { formatDuration } from '../utils/time';

function formatDate(ts: number | string): string {
  const ms = toEpochMs(ts);
  if (ms <= 0) return '—';
  return new Date(ms).toLocaleDateString();
}

function gameLabel(game: GameType): string {
  if (game === 'chess') return 'Chess';
  if (game === 'solitaire') return 'Solitaire';
  if (game === 'game2048') return '2048';
  return 'Puzzle';
}

type SortBy = 'time' | 'date' | 'player' | 'game';
type SortOrder = 'asc' | 'desc';

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardResponse['entries']>([]);
  const [error, setError] = useState('');
  const [gameFilter, setGameFilter] = useState<'all' | GameType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  function toggleSort(nextSortBy: SortBy) {
    if (sortBy === nextSortBy) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(nextSortBy);
    setSortOrder(nextSortBy === 'time' ? 'asc' : 'desc');
  }

  function sortMarker(key: SortBy) {
    if (sortBy !== key) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  }

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

  const visibleEntries = [...entries]
    .filter(row => gameFilter === 'all' || row.game === gameFilter)
    .sort((a, b) => {
      const factor = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'time') {
        return (
          factor *
          (toEpochMs(a.completionTimeMs) - toEpochMs(b.completionTimeMs))
        );
      }
      if (sortBy === 'date') {
        return factor * (toEpochMs(a.completedAt) - toEpochMs(b.completedAt));
      }
      if (sortBy === 'player') return factor * a.email.localeCompare(b.email);
      return factor * a.game.localeCompare(b.game);
    });

  return (
    <Layout
      title="Leaderboard"
      subtitle="Victory board. Refreshes every minute."
    >
      <div className="card">
        {error ? <p className="error">{error}</p> : null}
        <div className="leaderboard-filter-row">
          <label htmlFor="leaderboard-game-filter" className="field-label">
            Game
          </label>
          <select
            id="leaderboard-game-filter"
            value={gameFilter}
            onChange={e => setGameFilter(e.target.value as 'all' | GameType)}
          >
            <option value="all">All games</option>
            <option value="puzzle">Puzzle</option>
            <option value="chess">Chess</option>
            <option value="solitaire">Solitaire</option>
            <option value="game2048">2048</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() => toggleSort('player')}
                >
                  Player{sortMarker('player')}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() => toggleSort('game')}
                >
                  Game{sortMarker('game')}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() => toggleSort('time')}
                >
                  Time{sortMarker('time')}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="table-sort-button"
                  onClick={() => toggleSort('date')}
                >
                  Date{sortMarker('date')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((row, index) => (
              <tr key={`${row.rank}-${row.email}-${row.game}`}>
                <td>{index + 1}</td>
                <td>{row.email}</td>
                <td>{gameLabel(row.game)}</td>
                <td>{formatDuration(row.completionTimeMs)}</td>
                <td>{formatDate(row.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleEntries.length === 0 && !error ? (
          <p className="subtitle">No completions yet. Be the first!</p>
        ) : null}
      </div>
    </Layout>
  );
}
