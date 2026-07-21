import { useState, useEffect, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  stale: boolean;
}

const cache = new Map<string, CacheEntry<unknown>>();
const STALE_TIME = 30_000;
const pending = new Map<string, Promise<unknown>>();

export function useSWR<T>(key: string | null, fetcher: () => Promise<T>, options?: { staleTime?: number }) {
  const staleTime = options?.staleTime ?? STALE_TIME;
  const [data, setData] = useState<T | undefined>(() => {
    if (!key) return undefined;
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    return cached?.data;
  });

  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const keyRef = useRef(key);
  const fetcherRef = useRef(fetcher);

  fetcherRef.current = fetcher;

  const revalidate = useCallback(async () => {
    if (!key) return;
    const cached = cache.get(key) as CacheEntry<T> | undefined;

    if (cached && (Date.now() - cached.timestamp < staleTime)) {
      setData(cached.data);
      return cached.data;
    }

    const existing = pending.get(key);
    if (existing) {
      const result = await existing;
      setData(result as T);
      return result as T;
    }

    setLoading(true);
    setError(null);

    const promise = fetcherRef.current().then((result) => {
      cache.set(key, { data: result, timestamp: Date.now(), stale: false });
      pending.delete(key);
      setData(result);
      setLoading(false);
      return result;
    }).catch((err) => {
      pending.delete(key);
      setError(err);
      setLoading(false);
      throw err;
    });

    pending.set(key, promise);
    return (await promise) as T;
  }, [key, staleTime]);

  useEffect(() => {
    keyRef.current = key;
    if (key) {
      revalidate();
    }
  }, [key, revalidate]);

  const mutate = useCallback(async (newData: T | ((prev: T | undefined) => T)) => {
    if (!key) return;
    const resolved = typeof newData === 'function'
      ? (newData as (prev: T | undefined) => T)(data)
      : newData;
    cache.set(key, { data: resolved, timestamp: Date.now(), stale: false });
    setData(resolved);
  }, [key, data]);

  return { data, error, loading, revalidate, mutate };
}
