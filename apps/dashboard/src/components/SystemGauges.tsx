import { RadialBarChart, RadialBar, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface SystemGaugesProps {
  cpu: number;
  memPercent: number;
  diskPercent: number;
}

export function SystemGauges({ cpu, memPercent, diskPercent }: SystemGaugesProps) {
  const gaugeData = [
    { name: 'CPU', value: cpu, fill: '#d4af37' },
    { name: 'RAM', value: memPercent, fill: '#4ade80' },
    { name: 'Disk', value: diskPercent, fill: '#60a5fa' },
  ];

  return (
    <div className="glass p-4">
      <h2 className="mb-3 text-sm font-semibold text-vestara-gold">System Load</h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={14} data={gaugeData} startAngle={180} endAngle={0}>
            <RadialBar background dataKey="value" />
            <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', color: '#999' }} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
