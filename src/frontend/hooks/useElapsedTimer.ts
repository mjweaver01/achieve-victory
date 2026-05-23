import { useEffect, useState } from 'react';

function computeElapsedMs(
  startedAt: number | null,
  frozenMs: number,
  isStopped: boolean
): number {
  if (isStopped) return Math.max(0, frozenMs);
  if (!startedAt) return 0;
  return Math.max(0, Date.now() - startedAt);
}

type UseElapsedTimerOptions = {
  startedAt: number | null;
  frozenMs: number;
  isStopped: boolean;
  tickMs?: number;
};

export function useElapsedTimer({
  startedAt,
  frozenMs,
  isStopped,
  tickMs = 100,
}: UseElapsedTimerOptions): number {
  const [elapsedMs, setElapsedMs] = useState(() =>
    computeElapsedMs(startedAt, frozenMs, isStopped)
  );

  useEffect(() => {
    setElapsedMs(computeElapsedMs(startedAt, frozenMs, isStopped));
    if (isStopped || !startedAt) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, tickMs);
    return () => clearInterval(id);
  }, [startedAt, frozenMs, isStopped, tickMs]);

  return elapsedMs;
}
