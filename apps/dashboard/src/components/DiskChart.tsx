import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBytes } from '../utils/format';

interface DiskChartProps {
  used: number;
  free: number;
}

export function DiskChart({ used, free }: DiskChartProps) {
  const data = [
    { name: 'Used', value: used },
    { name: 'Free', value: free },
  ];

  return (
    <div className="glass p-4">
      <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Disk Usage</h2>
      <div className="h-40 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
              {data.map((_, i) => <Cell key={i} fill={i === 0 ? '#60a5fa' : 'rgba(255,255,255,0.05)'} />)}
            </Pie>
            <Tooltip formatter={(v) => formatBytes(Number(v))} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '8px', fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
