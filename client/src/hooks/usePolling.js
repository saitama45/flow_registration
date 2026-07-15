import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Poll an async fetcher on an interval for a realtime feel. Keeps the last
 * successful data on a transient error, and pauses while the browser tab is
 * hidden (resuming with an immediate fetch when it becomes visible again).
 */
export function usePolling(fetcher, intervalMs = 3000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let timer;
    const start = () => {
      load();
      timer = setInterval(() => {
        if (!document.hidden) load();
      }, intervalMs);
    };
    start();

    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, intervalMs]);

  return { data, error, loading, refresh: load };
}
