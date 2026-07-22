import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AgentStatus, AgentType } from '@vestara/types';

interface AgentDashboardProps {
  agents: any[];
  onAgentAction: (action: string, agentId: string, data?: any) => Promise<void>;
  onCreateAgent: (data: any) => Promise<void>;
}

export function AgentDashboard({ agents, onAgentAction, onCreateAgent }: AgentDashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AgentType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AgentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || agent.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || agent.status === selectedStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [agents, searchQuery, selectedType, selectedStatus]);

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return 'text-vestara-text-dim';
      case AgentStatus.RUNNING: return 'text-vestara-success';
      case AgentStatus.PAUSED: return 'text-vestara-gold';
      case AgentStatus.ERROR: return 'text-red-500';
      default: return 'text-vestara-text-muted';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return '⏸️';
      case AgentStatus.RUNNING: return '▶️';
      case AgentStatus.PAUSED: return '⏸️';
      case AgentStatus.ERROR: return '❌';
      default: return '⏸️';
    }
  };

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

  if (isCreatingAgent) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-vestara-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-vestara-border flex items-center justify-between">
            <h2 className="text-xl font-semibold text-vestara-text">Create New Agent</h2>
            <button
              onClick={() => setIsCreatingAgent(false)}
              className="p-2 hover:bg-vestara-surface/50 rounded-lg transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
          <div className="p-6">
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Agent Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
                  placeholder="Enter agent name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Type</label>
                <select className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50">
                  {Object.values(AgentType).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreatingAgent(false)}
                  className="px-4 py-2 text-sm text-vestara-text-muted hover:text-vestara-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-vestara-gold text-black rounded-lg text-sm font-medium hover:bg-vestara-gold/80 transition-colors"
                >
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vestara-text">Agent Manager</h1>
          <p className="text-sm text-vestara-text-muted">Manage and monitor AI agents.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-4 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text text-sm hover:bg-vestara-surface/80 transition-colors flex items-center gap-2"
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text text-sm hover:bg-vestara-surface/80 transition-colors flex items-center gap-2"
          >
            📑 Templates
          </button>
          <button
            onClick={() => setIsCreatingAgent(true)}
            className="px-4 py-2 bg-vestara-gold text-black rounded-lg text-sm font-medium hover:bg-vestara-gold/80 transition-colors flex items-center gap-2"
          >
            + New Agent
          </button>
        </div>
      </div>

      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-vestara-text">Total Agents</h3>
              <span className="text-lg">🤖</span>
            </div>
            <p className="text-2xl font-bold text-vestara-text">{agents.length}</p>
            <p className="text-xs text-vestara-text-muted">Active agents</p>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-vestara-text">Running</h3>
              <span className="text-lg">▶️</span>
            </div>
            <p className="text-2xl font-bold text-vestara-success">{agents.filter(a => a.status === AgentStatus.RUNNING).length}</p>
            <p className="text-xs text-vestara-text-muted">Currently executing</p>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-vestara-text">Total Executions</h3>
              <span className="text-lg">📊</span>
            </div>
            <p className="text-2xl font-bold text-vestara-text">
              {agents.reduce((sum, a) => sum + (a.statistics?.totalExecutions || 0), 0)}
            </p>
            <p className="text-xs text-vestara-text-muted">Lifetime executions</p>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-vestara-text">Error Rate</h3>
              <span className="text-lg">⚠️</span>
            </div>
            <p className="text-2xl font-bold text-vestara-text">2.3%</p>
            <p className="text-xs text-vestara-text-muted">From last 24h</p>
          </div>
        </div>
      )}

      {showTemplates && (
        <div className="glass rounded-lg p-6">
          <h2 className="text-lg font-semibold text-vestara-text mb-4">Popular Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Planner', type: 'planner', icon: '📋', usage: 1500 },
              { name: 'Developer', type: 'developer', icon: '💻', usage: 2300 },
              { name: 'DevOps', type: 'devops', icon: '🔧', usage: 800 },
              { name: 'Research', type: 'research', icon: '🔍', usage: 1200 },
            ].map((template) => (
              <div key={template.name} className="glass-sm rounded-lg p-4 hover:bg-vestara-surface/50 transition-colors cursor-pointer">
                <div className="text-2xl mb-2">{template.icon}</div>
                <h3 className="font-medium text-vestara-text mb-1">{template.name}</h3>
                <p className="text-xs text-vestara-text-muted">{template.usage} uses</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text placeholder-vestara-text-muted focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
          />
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAgents.map((agent) => (
          <div key={agent.id} className="glass rounded-lg p-4 hover:bg-vestara-surface/50 transition-all duration-200 group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getTypeIcon(agent.type)}</span>
                <div>
                  <h3 className="font-medium text-vestara-text text-sm">{agent.name}</h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400">{agent.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onAgentAction('toggle', agent.id)}
                  className={`p-1 rounded hover:bg-vestara-surface/50 transition-colors ${getStatusColor(agent.status)}`}
                >
                  <span className="text-sm">{getStatusIcon(agent.status)}</span>
                </button>
                <button className="p-1 rounded hover:bg-vestara-surface/50 transition-colors text-vestara-text-muted">
                  <span className="text-sm">⋮</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-3">
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
                <span className={`${getStatusColor(agent.status)} flex items-center gap-1`}>
                  <span className="text-xs">{getStatusIcon(agent.status)}</span>
                  {agent.status}
                </span>
              </div>
            </div>

            {agent.statistics && (
              <div className="mb-3 p-2 bg-vestara-surface/30 rounded-lg">
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

            <div className="flex gap-2">
              <button
                onClick={() => onAgentAction('run', agent.id)}
                className="flex-1 px-3 py-1.5 bg-vestara-success/20 text-vestara-success rounded-lg text-xs font-medium hover:bg-vestara-success/30 transition-colors flex items-center justify-center gap-1"
              >
                <span>▶️</span> Run
              </button>
              <button
                onClick={() => onAgentAction('delete', agent.id)}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center"
              >
                <span>🗑️</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-vestara-text mb-2">No agents found</h3>
          <p className="text-vestara-text-muted mb-4">
            {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your search filters'
              : 'Get started by creating your first agent'
            }
          </p>
          <button
            onClick={() => setIsCreatingAgent(true)}
            className="px-6 py-2 bg-vestara-gold text-black rounded-lg font-medium hover:bg-vestara-gold/80 transition-colors"
          >
            Create Agent
          </button>
        </div>
      )}
    </div>
  );
}
