import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useSettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Track which keys have unsaved local changes
  const dirtyKeys = useRef<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  // Recalculate global dirty from the set
  const recalcDirty = useCallback(() => {
    setDirty(dirtyKeys.current.size > 0);
  }, []);

  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

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
    dirtyKeys.current.add(key);
    recalcDirty();

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
          dirtyKeys.current.delete(key);
          recalcDirty();
        } else {
          const errBody = await res.json().catch(() => ({}));
          setError(errBody.error || `Failed to save ${key}`);
        }
      } catch {
        setError(`Failed to save ${key}: Network error`);
      } finally {
        debounceTimers.current.delete(key);
      }
    }, 500);
    debounceTimers.current.set(key, timer);
  }, [headers, recalcDirty]);

  const bulkUpdate = useCallback(async (entries: Record<string, string>) => {
    setSettings(prev => ({ ...prev, ...entries }));
    Object.keys(entries).forEach(k => dirtyKeys.current.add(k));
    recalcDirty();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(entries),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
        Object.keys(entries).forEach(k => dirtyKeys.current.delete(k));
        recalcDirty();
      }
    } catch {
      setError('Failed to save settings');
    }
  }, [headers, recalcDirty]);

  const resetSettings = useCallback(async () => {
    try {
      await fetch('/api/settings/reset', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      setSettings({});
      dirtyKeys.current.clear();
      recalcDirty();
    } catch {}
  }, [token, recalcDirty]);

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

  const clearError = useCallback(() => setError(null), []);

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
    clearError,
    updateSetting,
    bulkUpdate,
    resetSettings,
    backupSettings,
    refresh: fetchSettings,
  };
}
