import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HealthScoreMetrics {
  taskCompletion: number;
  timelineAdherence: number;
  resourceUtilization: number;
  riskLevel: number;
}

interface ProjectHealthScore {
  overall: number;
  metrics: HealthScoreMetrics;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trends: { taskCompletion: number; timeline: number };
}

interface ProjectInsights {
  healthScore: ProjectHealthScore;
  recommendations: string[];
  risks: string[];
  nextSteps: string[];
}

interface TrendData {
  metric: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  data: Array<{ date: string; value: number }>;
  trend: 'improving' | 'stable' | 'declining';
}

interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  projectId?: string;
  actionable: boolean;
  priority: number;
}

interface AnalyticsSnapshot {
  timestamp: string;
  trends: TrendData[];
  alerts: Alert[];
}

interface TeamInsights {
  totalProjects: number;
  totalTasks: number;
  activeAgents: string[];
  skillDistribution: Record<string, number>;
  productivityTrends: {
    tasksCreated: number[];
    tasksCompleted: number[];
    completionRate: number[];
  };
  timeToComplete: {
    averageDays: number;
    medianDays: number;
    bestCase: number;
    worstCase: number;
  };
  workloadDistribution: {
    distribution: Record<string, number>;
    balance: 'balanced' | 'uneven' | 'overloaded';
  };
}

interface AnalyticsData {
  insights?: ProjectInsights;
  snapshot?: AnalyticsSnapshot;
  teamInsights?: TeamInsights;
}

interface AnalyticsCardProps {
  title: string;
  icon: string;
  loading: boolean;
  error?: string;
  children: React.ReactNode;
}

function AnalyticsCard({ title, icon, loading, error, children }: AnalyticsCardProps) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-vestara-gold flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h3>
        {loading && (
          <div className="animate-pulse text-[10px] text-vestara-text-dim">Loading...</div>
        )}
      </div>
      {error && <div className="text-xs text-vestara-error mb-3">{error}</div>}
      <div className={loading ? 'opacity-50' : 'opacity-100'}>
        {children}
      </div>
    </div>
  );
}

function getHealthColor(status: string) {
  switch (status) {
    case 'excellent': return 'text-green-400';
    case 'good': return 'text-green-300';
    case 'warning': return 'text-yellow-400';
    case 'critical': return 'text-red-400';
    default: return 'text-vestara-gold';
  }
}

const CHART_COLORS = ['#C9A84C', '#4F8CFF', '#9B6DFF', '#22D3EE', '#22C55E', '#F59E0B'];

function ProjectHealthCard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch(`/api/analytics/projects/${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch project insights');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [projectId]);

  const insights = data.insights;
  if (!insights) return null;

  return (
    <AnalyticsCard title="Project Health" icon="📊" loading={loading} error={error}>
      <div className="space-y-4">
        <div className="text-center">
          <div className={`text-4xl font-bold mb-1 ${getHealthColor(insights.healthScore.status)}`}>
            {insights.healthScore.overall}
          </div>
          <div className="text-xs text-vestara-text-muted capitalize">
            {insights.healthScore.status} Health
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded bg-white/5 p-3">
            <div className="text-vestara-text-dim">Task Completion</div>
            <div className="font-semibold text-vestara-gold">{insights.healthScore.metrics.taskCompletion}%</div>
          </div>
          <div className="rounded bg-white/5 p-3">
            <div className="text-vestara-text-dim">Timeline</div>
            <div className="font-semibold text-vestara-gold">{insights.healthScore.metrics.timelineAdherence}%</div>
          </div>
          <div className="rounded bg-white/5 p-3">
            <div className="text-vestara-text-dim">Risk Level</div>
            <div className="font-semibold text-vestara-gold">{insights.healthScore.metrics.riskLevel}%</div>
          </div>
          <div className="rounded bg-white/5 p-3">
            <div className="text-vestara-text-dim">Resources</div>
            <div className="font-semibold text-vestara-gold">{insights.healthScore.metrics.resourceUtilization}%</div>
          </div>
        </div>

        {insights.risks.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-vestara-error mb-2">Risks</div>
            <ul className="text-[10px] space-y-1 text-vestara-text-dim">
              {insights.risks.slice(0, 3).map((risk: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-vestara-error mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.recommendations.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-vestara-gold mb-2">Recommendations</div>
            <ul className="text-[10px] space-y-1 text-vestara-text-dim">
              {insights.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-vestara-gold mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}

function TeamPerformanceCard() {
  const [data, setData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await fetch('/api/analytics/team');
        if (!res.ok) throw new Error('Failed to fetch team insights');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  const teamInsights = data.teamInsights;
  if (!teamInsights) return null;

  const completionRate = teamInsights.totalTasks > 0
    ? Math.round((teamInsights.productivityTrends.tasksCompleted.at(-1) || 0) / teamInsights.totalTasks * 100)
    : 0;

  const skillData = Object.entries(teamInsights.skillDistribution || {}).map(([name, value]) => ({
    name,
    value,
    fill: CHART_COLORS[Object.keys(teamInsights.skillDistribution).indexOf(name) % CHART_COLORS.length],
  }));

  return (
    <AnalyticsCard title="Team Performance" icon="👥" loading={loading} error={error}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-vestara-gold">{teamInsights.totalProjects}</div>
            <div className="text-[10px] text-vestara-text-dim">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-vestara-gold">{teamInsights.totalTasks}</div>
            <div className="text-[10px] text-vestara-text-dim">Total Tasks</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-vestara-text-dim">Completion Rate</span>
              <span className="text-vestara-gold">{completionRate}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div
                className="bg-vestara-gold h-2 rounded-full transition-all progress-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {teamInsights.activeAgents.length > 0 && (
            <div>
              <div className="text-xs text-vestara-text-dim mb-2">Active Agents</div>
              <div className="flex flex-wrap gap-2">
                {teamInsights.activeAgents.slice(0, 5).map((agent: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-white/5 rounded text-[10px] text-vestara-text-muted">
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {skillData.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={skillData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name }) => name}>
                  {skillData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}

function AnalyticsOverviewCard() {
  const [data, setData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const res = await fetch('/api/analytics/snapshot');
        if (!res.ok) throw new Error('Failed to fetch analytics snapshot');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshot();
  }, []);

  const snapshot = data.snapshot;
  if (!snapshot) return null;

  return (
    <div className="space-y-4">
      <AnalyticsCard title="Productivity Trends" icon="📈" loading={loading} error={error}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={snapshot.trends.slice(-7).map((t: any) => ({ date: t.metric, value: t.data?.[0]?.value || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#505A6E' }} />
              <YAxis tick={{ fontSize: 10, fill: '#505A6E' }} />
              <Tooltip contentStyle={{ background: '#0F0F19', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="value" fill="#C9A84C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AnalyticsCard>

      <AnalyticsCard title="Recent Alerts" icon="⚠️" loading={loading} error={error}>
        {snapshot.alerts.length === 0 ? (
          <p className="text-[10px] text-vestara-text-dim">No alerts</p>
        ) : (
          snapshot.alerts.slice(0, 5).map((alert: any) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg mb-2 border-l-4 ${
                alert.type === 'critical' ? 'bg-red-500/10 border-red-500' :
                alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                'bg-vestara-blue/10 border-vestara-blue'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-medium text-vestara-text">{alert.message}</div>
                  <div className="text-[10px] text-vestara-text-dim mt-1">
                    {alert.type.toUpperCase()} • {alert.actionable ? 'Actionable' : 'Information'}
                  </div>
                </div>
                <div className="text-[10px] text-vestara-text-dim">
                  {Math.round(alert.priority / 10)}%
                </div>
              </div>
            </div>
          ))
        )}
      </AnalyticsCard>
    </div>
  );
}

export function AnalyticsDashboard({ projectId }: { projectId?: string }) {
  return (
    <div className="space-y-4">
      {projectId ? (
        <ProjectHealthCard projectId={projectId} />
      ) : (
        <>
          <TeamPerformanceCard />
          <AnalyticsOverviewCard />
        </>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
