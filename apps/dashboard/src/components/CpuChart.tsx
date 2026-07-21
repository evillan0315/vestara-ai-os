import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChartPoint } from '../hooks/useDashboard';

interface CpuChartProps {
  data: ChartPoint[];
  expanded?: boolean;
}

export function CpuChart({ data, expanded }: CpuChartProps) {
  const [timeRange, setTimeRange] = useState<'30' | '60' | '120'>('60');

  const sliced = timeRange === '30' ? data.slice(-30) : timeRange === '60' ? data.slice(-60) : data;

  return (
    <div className={`glass p-4 ${expanded ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-vestara-gold">CPU Usage</h2>
        <div className="flex gap-1">
          {(['30', '60', '120'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                timeRange === r ? 'bg-vestara-gold/20 text-vestara-gold' : 'text-vestara-text-dim hover:text-vestara-text'
              }`}
            >
              {r}s
            </button>
          ))}
        </div>
      </div>
      <div className={expanded ? 'h-72' : 'h-48'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sliced}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#666' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#666' }} />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#999' }}
            />
            <Area type="monotone" dataKey="value" stroke="#d4af37" fill="url(#cpuGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
