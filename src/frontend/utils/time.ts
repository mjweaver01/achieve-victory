export function formatDuration(ms: number): string {
  const safeMs = Math.max(0, Number.isFinite(ms) ? ms : 0);

  if (safeMs >= 60 * 60 * 1000) {
    const totalSeconds = Math.floor(safeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  if (safeMs >= 60 * 1000) {
    const minutes = Math.floor(safeMs / 60000);
    const seconds = (safeMs % 60000) / 1000;
    return `${minutes}m ${seconds.toFixed(1).padStart(4, '0')}s`;
  }

  return `${(safeMs / 1000).toFixed(1)}s`;
}
