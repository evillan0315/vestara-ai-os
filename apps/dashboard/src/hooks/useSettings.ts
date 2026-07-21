import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useSettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = useCallback((key: string, value: string) => {
    // Optimistic local update
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);

    // Debounce save (500ms)
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ value }),
        });
        if (res.ok) {
          setDirty(false);
          debounceTimers.current.delete(key);
        }
      } catch {
        setError(`Failed to save ${key}`);
      }
    }, 500);
    debounceTimers.current.set(key, timer);
  }, [headers]);

  const bulkUpdate = useCallback(async (entries: Record<string, string>) => {
    setSettings(prev => ({ ...prev, ...entries }));
    setDirty(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(entries),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
        setDirty(false);
      }
    } catch {
      setError('Failed to save settings');
    }
  }, [headers]);

  const resetSettings = useCallback(async () => {
    try {
      await fetch('/api/settings/reset', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      setSettings({});
      setDirty(false);
    } catch {}
  }, [token]);

  const backupSettings = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/settings/backup', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        return data.path;
      }
    } catch {}
    return null;
  }, [token]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      for (const timer of debounceTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return {
    settings,
    loading,
    dirty,
    error,
    updateSetting,
    bulkUpdate,
    resetSettings,
    backupSettings,
    refresh: fetchSettings,
  };
}
