import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  count: number;
  rowHeight: number;
  overscan?: number;
};

export function useVirtualWindow({
  count,
  rowHeight,
  overscan = 8,
}: Options) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateViewport = () => setViewportHeight(el.clientHeight);
    updateViewport();

    const observer = new ResizeObserver(updateViewport);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, []);

  const totalHeight = count * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    count - 1,
    startIndex + Math.ceil(viewportHeight / rowHeight) + overscan * 2
  );

  return {
    scrollRef,
    totalHeight,
    startIndex,
    endIndex,
    onScroll,
    scrollToTop,
  };
}
