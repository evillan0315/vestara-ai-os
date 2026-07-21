import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChartPoint } from '../hooks/useDashboard';

interface MemChartProps {
  data: ChartPoint[];
}

export function MemChart({ data }: MemChartProps) {
  return (
    <div className="glass p-4">
      <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Memory Usage</h2>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#666' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#666' }} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="value" stroke="#4ade80" fill="url(#memGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
