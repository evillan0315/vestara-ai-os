interface SystemStatusProps {
  services?: Record<string, string>;
  status?: string;
}

const serviceLabels: Record<string, string> = {
  core: 'Core',
  api: 'API',
  database: 'DB',
  ollama: 'Ollama',
};

export function SystemStatus({ services, status }: SystemStatusProps) {
  if (!services && status) {
    return (
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${status === 'ok' ? 'bg-vestara-success animate-pulse' : 'bg-vestara-text-dim'}`} />
        <span className="text-xs text-vestara-text-muted">{status === 'ok' ? 'All Systems Ready' : 'Connecting...'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {services && Object.entries(services).map(([name, svcStatus]) => (
        <div key={name} className="flex items-center gap-1">
          <span className={`service-dot ${svcStatus}`} />
          <span className="text-[10px] text-vestara-text-dim">{serviceLabels[name] || name}</span>
        </div>
      ))}
    </div>
  );
}
