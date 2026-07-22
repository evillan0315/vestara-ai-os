import { PROVIDERS } from '@vestara/constants';

interface ModelStatsBarProps {
  providerCount: number;
  modelCount: number;
  connectedCount: number;
  localCount: number;
}

export function ModelStatsBar({ providerCount, modelCount, connectedCount, localCount }: ModelStatsBarProps) {
  const stats = [
    { label: 'Providers', value: providerCount, icon: '🔌' },
    { label: 'Models', value: modelCount, icon: '🤖' },
    { label: 'Connected', value: connectedCount, icon: '●', color: 'text-vestara-success' },
    { label: 'Local', value: localCount, icon: '🦙', color: 'text-vestara-cyan' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-sm p-3 text-center">
          <p className="text-lg">{stat.icon}</p>
          <p className={`text-xl font-bold ${stat.color || 'text-vestara-text'}`}>{stat.value}</p>
          <p className="text-[10px] text-vestara-text-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
