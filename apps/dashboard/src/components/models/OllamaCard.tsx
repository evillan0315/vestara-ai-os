import { useState } from 'react';
import { PROVIDERS } from '@vestara/constants';
import type { OllamaStatus } from '../../hooks/useProviders';

interface OllamaCardProps {
  status: OllamaStatus | null;
  loading: boolean;
  onPull: (model: string) => Promise<boolean>;
  onDelete: (model: string) => Promise<boolean>;
  onStart: () => Promise<boolean>;
  onStop: () => Promise<boolean>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function OllamaCard({ status, loading, onPull, onDelete, onStart, onStop }: OllamaCardProps) {
  const [pullModel, setPullModel] = useState('');
  const [pulling, setPulling] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const info = PROVIDERS.ollama;

  const handlePull = async () => {
    if (!pullModel.trim()) return;
    setPulling(true);
    await onPull(pullModel.trim());
    setPullModel('');
    setPulling(false);
  };

  const handleDelete = async (model: string) => {
    setDeleting(model);
    await onDelete(model);
    setDeleting(null);
  };

  const ramPercent = status?.ramTotal ? Math.round((status.ramUsed / status.ramTotal) * 100) : 0;

  return (
    <div className="glass border-vestara-cyan/20 p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{info.icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-vestara-text">{info.name}</h2>
            <p className="text-sm text-vestara-text-muted">{info.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status?.running ? (
            <span className="text-xs text-vestara-success">● Running</span>
          ) : (
            <span className="text-xs text-vestara-text-dim">○ Stopped</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-sm p-3">
          <p className="text-xs text-vestara-text-muted">Local Models</p>
          <p className="mt-1 text-sm font-medium text-vestara-text">{status?.models.length || 0}</p>
        </div>
        <div className="glass-sm p-3">
          <p className="text-xs text-vestara-text-muted">RAM Usage</p>
          <p className="mt-1 text-sm font-medium text-vestara-text">{ramPercent}%</p>
          <div className="mt-1 h-1 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-vestara-cyan transition-all" style={{ width: `${ramPercent}%` }} />
          </div>
        </div>
        <div className="glass-sm p-3">
          <p className="text-xs text-vestara-text-muted">Port</p>
          <p className="mt-1 text-sm font-medium text-vestara-text">{info.baseUrl.split(':').pop()}</p>
        </div>
        <div className="glass-sm p-3">
          <p className="text-xs text-vestara-text-muted">RAM Used</p>
          <p className="mt-1 text-sm font-medium text-vestara-text">{formatBytes(status?.ramUsed || 0)}</p>
        </div>
      </div>

      {/* Model List */}
      {status?.models && status.models.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-vestara-text-muted mb-2">Installed Models</p>
          <div className="space-y-1.5">
            {status.models.map((m) => (
              <div key={m.name} className="flex items-center justify-between glass-sm px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-vestara-text">{m.name}</span>
                  <span className="text-[10px] text-vestara-text-dim">{formatBytes(m.size)}</span>
                </div>
                <button
                  onClick={() => handleDelete(m.name)}
                  disabled={deleting === m.name}
                  className="text-[10px] text-vestara-text-dim hover:text-vestara-error"
                >
                  {deleting === m.name ? '...' : '✕'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pull Model */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={pullModel}
          onChange={(e) => setPullModel(e.target.value)}
          placeholder="Model name (e.g. llama2, deepseek-coder)"
          className="flex-1 rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-1.5 text-xs text-vestara-text outline-none font-mono"
          onKeyDown={(e) => e.key === 'Enter' && handlePull()}
        />
        <button onClick={handlePull} disabled={pulling || !pullModel.trim()} className="btn-gold text-xs disabled:opacity-50">
          {pulling ? 'Pulling...' : 'Pull Model'}
        </button>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {status?.running ? (
          <button onClick={onStop} className="glass-sm px-3 py-1.5 text-xs text-red-400 hover:text-red-300">
            ■ Stop Server
          </button>
        ) : (
          <button onClick={onStart} className="glass-sm px-3 py-1.5 text-xs text-vestara-cyan hover:text-vestara-cyan/80">
            ▶ Start Server
          </button>
        )}
      </div>
    </div>
  );
}
