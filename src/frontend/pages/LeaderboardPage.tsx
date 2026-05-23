import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import type { GameType, LeaderboardResponse } from '../../types';
import { gameLabel } from '../../lib/games';
import { toEpochMs } from '../../utils/epoch';
import { useVirtualWindow } from '../utils/useVirtualWindow';
import { formatDuration } from '../utils/time';

const LEADERBOARD_ROW_HEIGHT = 41;
const LEADERBOARD_COLUMNS = 5;

function formatDate(ts: number | string): string {
  const ms = toEpochMs(ts);
  if (ms <= 0) return '—';
  return new Date(ms).toLocaleDateString();
}
type SortBy = 'time' | 'date' | 'player' | 'game';
type SortOrder = 'asc' | 'desc';

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardResponse['entries']>([]);
  const [loading, setLoading] = useState(true);
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
      setError('');
      setEntries(data.entries);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, []);

  const visibleEntries = useMemo(
    () =>
      [...entries]
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
          if (sortBy === 'player') {
            return factor * a.email.localeCompare(b.email);
          }
          return factor * a.game.localeCompare(b.game);
        }),
    [entries, gameFilter, sortBy, sortOrder]
  );

  const { scrollRef, startIndex, endIndex, onScroll, scrollToTop } =
    useVirtualWindow({
      count: visibleEntries.length,
      rowHeight: LEADERBOARD_ROW_HEIGHT,
    });

  useEffect(() => {
    scrollToTop();
  }, [gameFilter, sortBy, sortOrder, scrollToTop]);

  const virtualRows =
    endIndex >= startIndex
      ? visibleEntries.slice(startIndex, endIndex + 1)
      : [];
  const topSpacerHeight = startIndex * LEADERBOARD_ROW_HEIGHT;
  const bottomSpacerHeight =
    visibleEntries.length > 0
      ? (visibleEntries.length - endIndex - 1) * LEADERBOARD_ROW_HEIGHT
      : 0;

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
        <div
          ref={scrollRef}
          className="leaderboard-table-scroll"
          onScroll={loading ? undefined : onScroll}
        >
          <table className="leaderboard-table">
            <colgroup>
              <col className="leaderboard-col-rank" />
              <col className="leaderboard-col-player" />
              <col className="leaderboard-col-game" />
              <col className="leaderboard-col-time" />
              <col className="leaderboard-col-date" />
            </colgroup>
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
              {loading ? (
                <tr>
                  <td colSpan={LEADERBOARD_COLUMNS} className="leaderboard-loading-cell">
                    <div
                      className="leaderboard-loading"
                      aria-busy="true"
                      aria-live="polite"
                    >
                      <span className="leaderboard-spinner" aria-hidden="true" />
                      <span>Loading leaderboard…</span>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {topSpacerHeight > 0 ? (
                    <tr aria-hidden="true" className="leaderboard-spacer">
                      <td
                        colSpan={LEADERBOARD_COLUMNS}
                        style={{ height: topSpacerHeight }}
                      />
                    </tr>
                  ) : null}
                  {virtualRows.map((row, offset) => {
                    const index = startIndex + offset;
                    return (
                      <tr key={`${row.rank}-${row.email}-${row.game}`}>
                        <td>{index + 1}</td>
                        <td>{row.email}</td>
                        <td>{gameLabel(row.game)}</td>
                        <td>{formatDuration(row.completionTimeMs)}</td>
                        <td>{formatDate(row.completedAt)}</td>
                      </tr>
                    );
                  })}
                  {bottomSpacerHeight > 0 ? (
                    <tr aria-hidden="true" className="leaderboard-spacer">
                      <td
                        colSpan={LEADERBOARD_COLUMNS}
                        style={{ height: bottomSpacerHeight }}
                      />
                    </tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>
        {!loading && visibleEntries.length === 0 && !error ? (
          <p className="subtitle leaderboard-empty">
            No completions yet. Be the first!
          </p>
        ) : null}
      </div>
    </Layout>
  );
}
