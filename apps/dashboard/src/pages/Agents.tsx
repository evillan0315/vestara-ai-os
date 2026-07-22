import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AgentStatus, AgentType } from '@vestara/types';

interface Agent {
  id: string;
  userId: string;
  name: string;
  type: AgentType;
  providerId?: string;
  modelId?: string;
  config: any;
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
  statistics?: {
    totalExecutions: number;
    successfulExecutions?: number;
    failedExecutions?: number;
    lastExecutionAt?: Date;
    averageTokens?: number;
    totalCost?: number;
    uptime?: number;
  };
}

const statusColors = {
  [AgentStatus.IDLE]: 'text-vestara-text-dim',
  [AgentStatus.RUNNING]: 'text-vestara-success',
  [AgentStatus.PAUSED]: 'text-vestara-gold',
  [AgentStatus.ERROR]: 'text-red-500',
};

export function Agents() {
  const { token } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AgentType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AgentStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setAgents(Array.isArray(data) ? data : data.agents || []);
        }
      } catch {
        // API not available yet
      } finally {
        setIsLoading(false);
      }
    };
    fetchAgents();
  }, [token]);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || agent.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || agent.status === selectedStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [agents, searchQuery, selectedType, selectedStatus]);

  const getTypeIcon = (type: AgentType) => {
    const icons: Record<AgentType, string> = {
      'planner': '📋',
      'developer': '💻',
      'devops': '🔧',
      'cloud_engineer': '☁️',
      'research': '🔍',
      'documentation': '📝',
      'qa': '🛡️',
      'security': '🔒',
      'custom': '🤖'
    };
    return icons[type] || '🤖';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vestara-gold"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 md:p-6">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-vestara-text">Agent Manager</h1>
        <p className="text-sm text-vestara-text-muted">Manage and run AI agents.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text placeholder-vestara-text-muted focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as AgentType | 'all')}
            className="px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text text-sm focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
          >
            <option value="all">All Types</option>
            {Object.values(AgentType).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as AgentStatus | 'all')}
            className="px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text text-sm focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
          >
            <option value="all">All Status</option>
            {Object.values(AgentStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 min-h-0 overflow-y-auto">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="glass rounded-lg p-4 hover:bg-vestara-surface/50 transition-all duration-200 group flex flex-col">
            <div className="flex items-start justify-between mb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getTypeIcon(agent.type)}</span>
                <div>
                  <h3 className="font-medium text-vestara-text text-sm">{agent.name}</h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400">{agent.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const newStatus = agent.status === AgentStatus.RUNNING ? AgentStatus.IDLE : AgentStatus.RUNNING;
                    setAgents(agents.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
                  }}
                  className={`p-1 rounded hover:bg-vestara-surface/50 transition-colors ${statusColors[agent.status]}`}
                >
                  <span className="text-sm">
                    {agent.status === AgentStatus.RUNNING ? '▶️' : '⏸️'}
                  </span>
                </button>
                <button className="p-1 rounded hover:bg-vestara-surface/50 transition-colors text-vestara-text-muted">
                  <span className="text-sm">⋮</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-3 flex-shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-vestara-text-muted">Provider:</span>
                <span className="text-vestara-text">{agent.providerId || 'Default'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-vestara-text-muted">Model:</span>
                <span className="text-vestara-text">{agent.modelId || 'Default'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-vestara-text-muted">Status:</span>
                <span className={`${statusColors[agent.status]} flex items-center gap-1`}>
                  {agent.status === AgentStatus.RUNNING ? '▶️' : agent.status === AgentStatus.PAUSED ? '⏸️' : agent.status === AgentStatus.ERROR ? '❌' : '⏸️'}
                  {agent.status}
                </span>
              </div>
            </div>

            {agent.statistics && (
              <div className="mb-3 p-2 bg-vestara-surface/30 rounded-lg flex-shrink-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-vestara-text-muted">Executions:</span>
                  <span className="text-vestara-text font-medium">{agent.statistics.totalExecutions}</span>
                </div>
                {agent.statistics.lastExecutionAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-vestara-text-muted">Last run:</span>
                    <span className="text-vestara-text">{new Date(agent.statistics.lastExecutionAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-auto flex-shrink-0">
              <button
                onClick={() => {
                  setAgents(agents.map(a => a.id === agent.id ? { ...a, status: AgentStatus.RUNNING, statistics: { ...a.statistics, totalExecutions: (a.statistics?.totalExecutions || 0) + 1, lastExecutionAt: new Date() } } : a));
                }}
                className="flex-1 px-3 py-1.5 bg-vestara-success/20 text-vestara-success rounded-lg text-xs font-medium hover:bg-vestara-success/30 transition-colors flex items-center justify-center gap-1"
              >
                <span>▶️</span> Run
              </button>
              <button
                onClick={() => setAgents(agents.filter(a => a.id !== agent.id))}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center"
              >
                <span>🗑️</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 flex-1 flex items-center justify-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-vestara-text mb-2">No agents found</h3>
          <p className="text-vestara-text-muted mb-4">
            {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your search filters'
              : 'Get started by creating your first agent'
            }
          </p>
          <button
            onClick={() => setAgents([{ id: 'new-agent', name: 'Demo Agent', type: AgentType.PLANNER, providerId: 'openai', modelId: 'gpt-4', config: {}, status: AgentStatus.IDLE, createdAt: new Date(), updatedAt: new Date(), userId: '', statistics: { totalExecutions: 0, lastExecutionAt: new Date() } }])}
            className="px-6 py-2 bg-vestara-gold text-black rounded-lg font-medium hover:bg-vestara-gold/80 transition-colors"
          >
            Create Agent
          </button>
        </div>
      )}
    </div>
  );
}