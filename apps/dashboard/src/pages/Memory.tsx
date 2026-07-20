import { useState, useEffect } from 'react';

interface Memory {
  id: number;
  userId: string;
  type: 'fact' | 'preference' | 'context' | 'insight' | 'interaction';
  content: string;
  importance: number;
  accessCount: number;
  lastAccessedAt: string;
  consolidationId: number | null;
  createdAt: string;
}

interface MemoryStats {
  total: number;
  byType: Record<string, number>;
  avgImportance: number;
  consolidatedCount: number;
}

export default function Memory() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemory, setNewMemory] = useState({
    type: 'fact' as const,
    content: '',
    importance: 0.5,
  });

  useEffect(() => {
    fetchMemories();
    fetchStats();
  }, []);

  const fetchMemories = async () => {
    try {
      const response = await fetch('/api/memory?limit=50');
      if (response.ok) {
        const data = await response.json();
        setMemories(data);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/memory/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const searchMemories = async () => {
    if (!searchQuery) {
      fetchMemories();
      return;
    }
    try {
      const response = await fetch(`/api/memory/search?query=${encodeURIComponent(searchQuery)}&type=${filterType}`);
      if (response.ok) {
        const data = await response.json();
        setMemories(data);
      }
    } catch (error) {
      console.error('Failed to search memories:', error);
    }
  };

  const addMemory = async () => {
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory),
      });
      if (response.ok) {
        setShowAddModal(false);
        setNewMemory({ type: 'fact', content: '', importance: 0.5 });
        fetchMemories();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  };

  const deleteMemory = async (id: number) => {
    if (!confirm('Delete this memory?')) return;
    try {
      const response = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchMemories();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const consolidateMemories = async () => {
    try {
      const response = await fetch('/api/memory/consolidate', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        alert(`Consolidated ${data.consolidated} memory groups`);
        fetchMemories();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to consolidate:', error);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fact: 'bg-blue-500/20 text-blue-400',
      preference: 'bg-purple-500/20 text-purple-400',
      context: 'bg-green-500/20 text-green-400',
      insight: 'bg-yellow-500/20 text-yellow-400',
      interaction: 'bg-pink-500/20 text-pink-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 0.8) return 'text-red-400';
    if (importance >= 0.5) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-[#4a9eff] text-lg">Loading memories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Memory</h1>
            <p className="text-gray-400 mt-1">Store and retrieve information across conversations</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={consolidateMemories}
              className="px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e] transition-colors"
            >
              Consolidate
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef] transition-colors"
            >
              Add Memory
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Memories</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Avg Importance</div>
              <div className={`text-2xl font-bold mt-1 ${getImportanceColor(stats.avgImportance)}`}>
                {(stats.avgImportance * 100).toFixed(0)}%
              </div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Consolidated</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.consolidatedCount}</div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Types</div>
              <div className="text-2xl font-bold text-white mt-1">{Object.keys(stats.byType).length}</div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchMemories()}
            className="flex-1 px-4 py-2 bg-[#12121e] border border-[#1e1e2e] rounded-lg focus:outline-none focus:border-[#4a9eff]"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-[#12121e] border border-[#1e1e2e] rounded-lg focus:outline-none focus:border-[#4a9eff]"
          >
            <option value="">All Types</option>
            <option value="fact">Fact</option>
            <option value="preference">Preference</option>
            <option value="context">Context</option>
            <option value="insight">Insight</option>
            <option value="interaction">Interaction</option>
          </select>
          <button
            onClick={searchMemories}
            className="px-6 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef] transition-colors"
          >
            Search
          </button>
        </div>

        {/* Memory List */}
        <div className="space-y-4">
          {memories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No memories found. Add one to get started.
            </div>
          ) : (
            memories.map((memory) => (
              <div
                key={memory.id}
                className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4 hover:border-[#2a2a3e] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${getTypeColor(memory.type)}`}>
                        {memory.type}
                      </span>
                      <span className={`text-sm ${getImportanceColor(memory.importance)}`}>
                        Importance: {(memory.importance * 100).toFixed(0)}%
                      </span>
                      <span className="text-gray-500 text-sm">
                        Accessed {memory.accessCount} times
                      </span>
                    </div>
                    <p className="text-gray-300">{memory.content}</p>
                    <div className="text-gray-500 text-sm mt-2">
                      Created: {new Date(memory.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    className="text-red-400 hover:text-red-300 ml-4"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Memory Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Memory</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select
                    value={newMemory.type}
                    onChange={(e) => setNewMemory({ ...newMemory, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                  >
                    <option value="fact">Fact</option>
                    <option value="preference">Preference</option>
                    <option value="context">Context</option>
                    <option value="insight">Insight</option>
                    <option value="interaction">Interaction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Content</label>
                  <textarea
                    value={newMemory.content}
                    onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg h-24"
                    placeholder="What should I remember?"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Importance: {(newMemory.importance * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newMemory.importance}
                    onChange={(e) => setNewMemory({ ...newMemory, importance: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addMemory}
                    className="flex-1 px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
