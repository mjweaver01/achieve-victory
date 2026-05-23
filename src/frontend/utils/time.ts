import { toEpochMs } from '../../utils/epoch';

function formatSecondCount(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(1);
}

export function formatDuration(ms: number | string): string {
  const safeMs = Math.max(0, toEpochMs(ms));

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
    return `${minutes}m ${formatSecondCount(seconds)}s`;
  }

  return `${formatSecondCount(safeMs / 1000)}s`;
}
