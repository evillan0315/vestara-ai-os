import { PROVIDERS, type ModelInfo } from '@vestara/constants';

interface ModelDetailSheetProps {
  model: ModelInfo & { providerKey: string };
  onClose: () => void;
}

function formatPrice(price?: number): string {
  if (price === undefined) return '—';
  return `$${price.toFixed(2)}`;
}

function formatContext(context?: number): string {
  if (!context) return '—';
  if (context >= 1_000_000) return `${(context / 1_000_000).toFixed(0)}M`;
  if (context >= 1_000) return `${(context / 1_000).toFixed(0)}K`;
  return String(context);
}

export function ModelDetailSheet({ model, onClose }: ModelDetailSheetProps) {
  const provider = PROVIDERS[model.providerKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="glass rounded-lg p-6 w-full max-w-md mx-3 border border-vestara-glass-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{provider?.icon || '🤖'}</span>
            <div>
              <h3 className="text-lg font-bold text-vestara-text">{model.name}</h3>
              <p className="text-xs text-vestara-text-muted">{provider?.name || model.providerKey}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-vestara-text-dim hover:text-vestara-text">✕</button>
        </div>

        {model.description && (
          <p className="text-sm text-vestara-text-muted mb-4">{model.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-sm p-3">
            <p className="text-xs text-vestara-text-muted">Context Window</p>
            <p className="mt-1 text-lg font-bold text-vestara-text">{formatContext(model.context)}</p>
          </div>
          <div className="glass-sm p-3">
            <p className="text-xs text-vestara-text-muted">Model ID</p>
            <p className="mt-1 text-xs font-mono text-vestara-text truncate">{model.id}</p>
          </div>
          <div className="glass-sm p-3">
            <p className="text-xs text-vestara-text-muted">Input Price</p>
            <p className="mt-1 text-lg font-bold text-vestara-text">{formatPrice(model.inputPrice)}<span className="text-xs text-vestara-text-dim">/1M tokens</span></p>
          </div>
          <div className="glass-sm p-3">
            <p className="text-xs text-vestara-text-muted">Output Price</p>
            <p className="mt-1 text-lg font-bold text-vestara-text">{formatPrice(model.outputPrice)}<span className="text-xs text-vestara-text-dim">/1M tokens</span></p>
          </div>
        </div>

        {provider && (
          <div className="mt-4">
            <p className="text-xs text-vestara-text-muted mb-2">Provider Features</p>
            <div className="flex flex-wrap gap-1.5">
              {provider.features.map((f) => (
                <span key={f} className="glass-sm px-2 py-1 text-[10px] text-vestara-text capitalize">
                  {f.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className="mt-6 w-full glass-sm px-4 py-2 text-xs text-vestara-text hover:text-vestara-text-muted">
          Close
        </button>
      </div>
    </div>
  );
}
