import { useState } from 'react';
import { OPENCODE_MODELS, PROVIDERS } from '@vestara/constants';
import type { OpenCodeStatus } from '../../hooks/useProviders';

interface OpenCodeCardProps {
  status: OpenCodeStatus | null;
  onStart: () => void;
  onStop: () => void;
}

export function OpenCodeCard({ status, onStart, onStop }: OpenCodeCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latency?: number } | null>(null);

  const info = PROVIDERS.opencode;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const start = Date.now();
      const res = await fetch(info.baseUrl);
      setTestResult({ ok: res.ok, latency: Date.now() - start });
    } catch {
      setTestResult({ ok: false });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="glass border-vestara-gold/20 p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{info.icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-vestara-text">{info.name}</h2>
            <p className="text-sm text-vestara-text-muted">{info.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status?.installed ? (
            <span className="text-xs text-vestara-success">● Installed{status.version ? ` (${status.version})` : ''}</span>
          ) : (
            <span className="text-xs text-vestara-warning">○ Not installed</span>
          )}
          {status?.serverRunning ? (
            <span className="text-xs text-vestara-success">● Running</span>
          ) : (
            <span className="text-xs text-vestara-text-dim">○ Stopped</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-sm p-3">
          <p className="text-xs text-vestara-text-muted">Models</p>
          <p className="mt-1 text-sm font-medium text-vestara-text">{info.models.length} free</p>
        </div>
        <div className="glass-sm p-3">
          <p className="text-xs text-vestara-text-muted">Port</p>
          <p className="mt-1 text-sm font-medium text-vestara-text">{info.baseUrl.split(':').pop()}</p>
        </div>
        <div className="glass-sm p-3">
          <p className="text-xs text-vestara-text-muted">Integration</p>
          <p className="mt-1 text-sm font-medium text-vestara-text">AI SDK</p>
        </div>
        <div className="glass-sm p-3">
          <p className="text-xs text-vestara-text-muted">Latency</p>
          <p className="mt-1 text-sm font-medium text-vestara-text">
            {testResult?.latency ? `${testResult.latency}ms` : '—'}
          </p>
        </div>
      </div>

      {/* Models */}
      <div className="mt-3">
        <p className="text-xs text-vestara-text-muted mb-2">Available Models</p>
        <div className="flex flex-wrap gap-1.5">
          {OPENCODE_MODELS.map((m) => (
            <span key={m.id} className="glass-sm px-2 py-1 text-[10px] text-vestara-text" title={m.description}>
              {m.name}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {status?.serverRunning ? (
          <button onClick={onStop} className="glass-sm px-3 py-1.5 text-xs text-red-400 hover:text-red-300">
            ■ Stop Server
          </button>
        ) : (
          <button onClick={onStart} className="btn-gold text-xs">
            ▶ Start Server
          </button>
        )}
        <button onClick={handleTest} disabled={testing} className="glass-sm px-3 py-1.5 text-xs text-vestara-text-muted hover:text-vestara-text">
          {testing ? 'Testing...' : '⟳ Test Connection'}
        </button>
        <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer" className="glass-sm px-3 py-1.5 text-xs text-vestara-gold hover:text-vestara-gold-light">
          Docs ↗
        </a>
      </div>
    </div>
  );
}
