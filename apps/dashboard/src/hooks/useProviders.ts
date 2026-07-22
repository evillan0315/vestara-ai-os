import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface Provider {
  id: string;
  name: string;
  type: string;
  api_key_encrypted: string | null;
  base_url: string | null;
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
}

export interface ProviderTestResult {
  status: 'ok' | 'error';
  message: string;
  latency?: number;
  models?: string[];
}

export interface OllamaStatus {
  running: boolean;
  models: { name: string; size: number; modified: string }[];
  ramUsed: number;
  ramTotal: number;
}

export interface OpenCodeStatus {
  installed: boolean;
  version: string | null;
  serverRunning: boolean;
  serverUrl: string | null;
}

export function useProviders() {
  const { token } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setError(null);
      }
    } catch {
      setError('Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const toggleProvider = useCallback(async (id: string, enabled: boolean) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, enabled } : p)));
    try {
      await fetch(`/api/providers/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ enabled }) });
    } catch {
      setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !enabled } : p)));
    }
  }, [headers]);

  const addProvider = useCallback(async (data: { name: string; type: string; apiKey?: string; baseUrl?: string }) => {
    const res = await fetch('/api/providers', { method: 'POST', headers, body: JSON.stringify(data) });
    if (res.ok) {
      await fetchProviders();
      return true;
    }
    return false;
  }, [headers, fetchProviders]);

  const deleteProvider = useCallback(async (id: string) => {
    const res = await fetch(`/api/providers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      setProviders((prev) => prev.filter((p) => p.id !== id));
      return true;
    }
    return false;
  }, [token]);

  const updateProvider = useCallback(async (id: string, updates: { name?: string; apiKey?: string; baseUrl?: string }) => {
    const res = await fetch(`/api/providers/${id}`, { method: 'PATCH', headers, body: JSON.stringify(updates) });
    if (res.ok) {
      await fetchProviders();
      return true;
    }
    return false;
  }, [headers, fetchProviders]);

  const testConnection = useCallback(async (id: string): Promise<ProviderTestResult> => {
    try {
      const res = await fetch(`/api/providers/${id}/test`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      return await res.json();
    } catch {
      return { status: 'error', message: 'Network error' };
    }
  }, [token]);

  const getProviderByType = useCallback((type: string) => {
    return providers.find((p) => p.type === type) || null;
  }, [providers]);

  const connectedCount = providers.filter((p) => p.enabled).length;

  return {
    providers,
    loading,
    error,
    connectedCount,
    fetchProviders,
    toggleProvider,
    addProvider,
    deleteProvider,
    updateProvider,
    testConnection,
    getProviderByType,
  };
}

export function useOllama() {
  const { token } = useAuth();
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama/status', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // Ollama not available
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const pullModel = useCallback(async (model: string) => {
    const res = await fetch('/api/ollama/pull', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    return res.ok;
  }, [token]);

  const deleteModel = useCallback(async (model: string) => {
    const res = await fetch('/api/ollama/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    if (res.ok) await fetchStatus();
    return res.ok;
  }, [token, fetchStatus]);

  const startServer = useCallback(async () => {
    const res = await fetch('/api/ollama/start', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) await fetchStatus();
    return res.ok;
  }, [token, fetchStatus]);

  const stopServer = useCallback(async () => {
    const res = await fetch('/api/ollama/stop', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) await fetchStatus();
    return res.ok;
  }, [token, fetchStatus]);

  return { status, loading, fetchStatus, pullModel, deleteModel, startServer, stopServer };
}

export function useOpenCodeStatus() {
  const { token } = useAuth();
  const [status, setStatus] = useState<OpenCodeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/providers/opencode/status', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStatus(await res.json());
    } catch {
      // OpenCode not available
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const startServer = useCallback(async (cwd?: string) => {
    const res = await fetch('/api/providers/opencode/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd }),
    });
    if (res.ok) await fetchStatus();
    return res.ok;
  }, [token, fetchStatus]);

  const stopServer = useCallback(async () => {
    const res = await fetch('/api/providers/opencode/stop', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) await fetchStatus();
    return res.ok;
  }, [token, fetchStatus]);

  return { status, loading, fetchStatus, startServer, stopServer };
}
