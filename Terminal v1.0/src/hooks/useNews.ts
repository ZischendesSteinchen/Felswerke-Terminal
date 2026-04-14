'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTerminalStore } from '@/store/useTerminalStore';

export function useNews() {
  const setNews = useTerminalStore((s) => s.setNews);
  const setNewsError = useTerminalStore((s) => s.setNewsError);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news');
      if (!res.ok) {
        setNewsError(true);
        return;
      }
      const data = await res.json();
      if (data.news?.length) {
        setNews(data.news);
      } else {
        setNewsError(true);
      }
    } catch {
      setNewsError(true);
    }
  }, [setNews]);

  useEffect(() => {
    fetchNews();
    intervalRef.current = setInterval(fetchNews, 120000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNews]);
}
