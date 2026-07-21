import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
}

const builtInAgents = [
  { name: 'Planner', type: 'planner', icon: '📋', desc: 'Task decomposition' },
  { name: 'Developer', type: 'developer', icon: '💻', desc: 'Code generation' },
  { name: 'DevOps', type: 'devops', icon: '🔧', desc: 'Infrastructure' },
  { name: 'Cloud Engineer', type: 'cloud_engineer', icon: '☁️', desc: 'Cloud resources' },
  { name: 'Research', type: 'research', icon: '🔍', desc: 'Web search & analysis' },
  { name: 'Documentation', type: 'documentation', icon: '📝', desc: 'Docs generation' },
  { name: 'QA', type: 'qa', icon: '🛡️', desc: 'Testing & bugs' },
  { name: 'Security', type: 'security', icon: '🔒', desc: 'Vulnerability scan' },
];

export function Agents() {
  const { token } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setAgents(Array.isArray(data) ? data : data.agents || []);
        }
      } catch {
        // API not available yet
      }
    };
    fetchAgents();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vestara-text">Agent Manager</h1>
        <p className="text-sm text-vestara-text-muted">Configure and run AI agents.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {builtInAgents.map((agent) => {
          const instance = agents.find((a) => a.type === agent.type);
          return (
            <div key={agent.type} className="glass p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{agent.icon}</span>
                <div>
                  <p className="font-medium text-vestara-text">{agent.name}</p>
                  <p className="text-xs text-vestara-text-muted">{agent.desc}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs ${instance ? 'text-vestara-success' : 'text-vestara-text-dim'}`}>
                  {instance ? '● Configured' : '○ Not configured'}
                </span>
                <button className="text-xs text-vestara-gold hover:text-vestara-gold-light">
                  {instance ? 'Configure' : 'Set up'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
