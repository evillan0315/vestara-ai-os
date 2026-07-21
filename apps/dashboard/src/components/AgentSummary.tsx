interface Agent {
  id: string;
  name: string;
  status: string;
  type: string;
}

interface AgentSummaryProps {
  agents: Agent[];
}

export function AgentSummary({ agents }: AgentSummaryProps) {
  if (!agents?.length) return null;

  const running = agents.filter((a) => a.status === 'running').length;
  const idle = agents.filter((a) => a.status === 'idle').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-vestara-gold">Agents</h2>
        <a href="/agents" className="text-[10px] text-vestara-text-dim hover:text-vestara-gold transition-colors">View all</a>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-vestara-text tabular-nums">{agents.length}</p>
          <p className="text-[10px] text-vestara-text-muted">Total</p>
        </div>
        <div className="glass-sm rounded-lg p-2.5 text-center">
          <p className={`text-lg font-bold tabular-nums ${running > 0 ? 'text-vestara-success' : 'text-vestara-text-dim'}`}>
            {running}
          </p>
          <p className="text-[10px] text-vestara-text-muted">Running</p>
        </div>
      </div>
      {running > 0 && (
        <div className="mt-2 space-y-1">
          {agents.filter((a) => a.status === 'running').slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs text-vestara-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-vestara-success animate-pulse" />
              <span className="truncate">{a.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
