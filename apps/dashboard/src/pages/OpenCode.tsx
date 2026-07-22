import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { seedVestaraThemeInIframe, injectVestaraTheme } from '../lib/opencode-theme';

type ServerStatus = 'loading' | 'running' | 'stopped' | 'error';

interface OpenCodeStatus {
  installed: boolean;
  version: string | null;
  serverRunning: boolean;
  serverUrl: string | null;
}

interface Project {
  id: string;
  name: string;
  path?: string;
  status: string;
}

const PROJECT_STORAGE_KEY = 'opencode-selected-project';

export function OpenCodePage() {
  const { token } = useAuth();
  const { resolvedTheme } = useTheme();
  const { addToast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [serverStatus, setServerStatus] = useState<ServerStatus>('loading');
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<OpenCodeStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [key, setKey] = useState(0);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => localStorage.getItem(PROJECT_STORAGE_KEY)
  );
  const [loadingProjects, setLoadingProjects] = useState(true);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  /** Fetch projects */
  useEffect(() => {
    if (!token) return;
    setLoadingProjects(true);
    fetch('/api/projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects || []);
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, [token]);

  /** Persist selected project */
  const handleSelectProject = useCallback((id: string | null) => {
    setSelectedProjectId(id);
    if (id) {
      localStorage.setItem(PROJECT_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/providers/opencode/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: OpenCodeStatus = await res.json();
        setStatusInfo(data);
        if (data.serverRunning && data.serverUrl) {
          setServerUrl(data.serverUrl);
          setServerStatus('running');
        } else {
          setServerStatus('stopped');
        }
      } else {
        setServerStatus('error');
      }
    } catch {
      setServerStatus('error');
    }
  }, [token]);

  const startServer = useCallback(async (cwd?: string) => {
    setStarting(true);
    try {
      const res = await fetch('/api/providers/opencode/start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cwd }),
      });
      if (res.ok) {
        const data = await res.json();
        setServerUrl(data.serverUrl || `http://localhost:${data.port}`);
        setServerStatus('running');
        setKey((k) => k + 1);
        addToast(cwd ? `OpenCode started in ${cwd.split('/').pop()}` : 'OpenCode server started');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to start' }));
        setServerStatus('error');
        addToast(err.error || 'Failed to start server', 'error');
      }
    } catch (e) {
      setServerStatus('error');
      addToast(`Failed to start: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    } finally {
      setStarting(false);
    }
  }, [token, addToast]);

  const stopServer = useCallback(async () => {
    try {
      await fetch('/api/providers/opencode/stop', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setServerUrl(null);
      setServerStatus('stopped');
      addToast('OpenCode server stopped');
    } catch (e) {
      addToast(`Failed to stop: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
  }, [token, addToast]);

  /** Auto-start with selected project's directory */
  const handleStartWithProject = useCallback(() => {
    const cwd = selectedProject?.path || undefined;
    startServer(cwd);
  }, [selectedProject, startServer]);

  /** Switch project: stop server, restart with new directory */
  const handleSwitchProject = useCallback(async (id: string | null) => {
    handleSelectProject(id);
    const project = projects.find((p) => p.id === id);
    if (project?.path && serverStatus === 'running') {
      await stopServer();
      setTimeout(() => startServer(project.path), 500);
    }
  }, [projects, serverStatus, handleSelectProject, stopServer, startServer]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (serverStatus === 'running') return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [serverStatus, checkStatus]);

  /** Apply Vestara theme after iframe loads */
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    seedVestaraThemeInIframe(iframe);
    injectVestaraTheme(iframe, resolvedTheme);
  }, [resolvedTheme]);

  /** Re-apply theme when dashboard theme changes */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || serverStatus !== 'running') return;
    injectVestaraTheme(iframe, resolvedTheme);
  }, [resolvedTheme, serverStatus, key]);

  if (serverStatus === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-5 w-5 border-2 border-vestara-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-vestara-text-muted">Checking OpenCode status...</p>
        </div>
      </div>
    );
  }

  if (serverStatus === 'stopped' || serverStatus === 'error') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="glass max-w-md w-full p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-vestara-gold/10 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-vestara-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-vestara-text">OpenCode Server</h2>
            <p className="text-sm text-vestara-text-muted mt-1">
              {serverStatus === 'error'
                ? 'Unable to connect to OpenCode server'
                : 'The OpenCode server is not running'}
            </p>
          </div>
          {statusInfo && (
            <div className="text-[10px] text-vestara-text-dim space-y-1">
              <p>Installed: {statusInfo.installed ? `Yes (${statusInfo.version})` : 'No'}</p>
            </div>
          )}

          {/* Project selector */}
          <div className="text-left space-y-2">
            <label className="text-[10px] font-medium text-vestara-text-muted uppercase tracking-wider">
              Project Directory
            </label>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => handleSelectProject(e.target.value || null)}
              className="w-full rounded-lg border border-vestara-glass-border bg-vestara-surface-2 px-3 py-2 text-sm text-vestara-text focus:outline-none focus:border-vestara-gold/50"
            >
              <option value="">No project (default dir)</option>
              {projects
                .filter((p) => p.path)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.path}
                  </option>
                ))}
            </select>
            {selectedProject?.path && (
              <p className="text-[10px] text-vestara-text-dim truncate">
                Working directory: {selectedProject.path}
              </p>
            )}
          </div>

          <button
            onClick={handleStartWithProject}
            disabled={starting || !statusInfo?.installed}
            className="btn-gold w-full text-sm disabled:opacity-50"
          >
            {starting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 border-2 border-vestara-bg border-t-transparent rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              selectedProject ? `Start in ${selectedProject.name}` : 'Start OpenCode Server'
            )}
          </button>
          <button onClick={checkStatus} className="text-[10px] text-vestara-text-dim hover:text-vestara-text">
            Refresh status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-vestara-glass-border">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-vestara-glass-border px-3 py-2 bg-vestara-surface">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-vestara-success animate-pulse" />
          <span className="text-xs font-medium text-vestara-text">OpenCode</span>
          <span className="text-[10px] text-vestara-text-dim">{statusInfo?.version}</span>
        </div>

        {/* Project switcher in toolbar */}
        {projects.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            <svg className="w-3 h-3 text-vestara-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => handleSwitchProject(e.target.value || null)}
              className="bg-transparent border-0 text-[10px] text-vestara-text-muted hover:text-vestara-text cursor-pointer focus:outline-none max-w-[180px] truncate"
            >
              <option value="" className="bg-vestara-surface">No project</option>
              {projects
                .filter((p) => p.path)
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-vestara-surface">
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setKey((k) => k + 1)}
            className="rounded px-2 py-1 text-[10px] text-vestara-text-muted hover:text-vestara-text border border-vestara-glass-border hover:bg-white/5 transition-colors"
            title="Reload OpenCode"
          >
            ↻ Reload
          </button>
          <button
            onClick={() => iframeRef.current?.contentWindow?.postMessage({ type: 'focus' }, '*')}
            className="rounded px-2 py-1 text-[10px] text-vestara-text-muted hover:text-vestara-text border border-vestara-glass-border hover:bg-white/5 transition-colors"
            title="Focus input"
          >
            ⌘ Focus
          </button>
          <button
            onClick={stopServer}
            className="rounded px-2 py-1 text-[10px] text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/10 transition-colors"
            title="Stop server"
          >
            ■ Stop
          </button>
        </div>
      </div>

      {/* Iframe */}
      <iframe
        key={key}
        ref={iframeRef}
        src={serverUrl || undefined}
        className="flex-1 w-full border-0 bg-white"
        title="OpenCode"
        allow="clipboard-write; clipboard-read"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
