import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface KnowledgeEntry {
  id: number;
  projectId: number | null;
  type: 'document' | 'code' | 'url' | 'note' | 'conversation';
  title: string;
  content: string;
  tags: string[];
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeStats {
  total: number;
  byType: Record<string, number>;
  totalSize: number;
}

export default function Knowledge() {
  const { token } = useAuth();
  const authHeaders = { Authorization: `Bearer ${token}` };
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    type: 'note' as const,
    title: '',
    content: '',
    tags: '',
    source: '',
  });

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/knowledge?limit=50', { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/knowledge/stats', { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const searchEntries = async () => {
    if (!searchQuery) {
      fetchEntries();
      return;
    }
    try {
      const response = await fetch(`/api/knowledge/search?query=${encodeURIComponent(searchQuery)}&type=${filterType}`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setEntries(data.map((r: any) => r.entry));
      }
    } catch (error) {
      console.error('Failed to search entries:', error);
    }
  };

  const addEntry = async () => {
    try {
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEntry,
          tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (response.ok) {
        setShowAddModal(false);
        setNewEntry({ type: 'note', title: '', content: '', tags: '', source: '' });
        fetchEntries();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to add entry:', error);
    }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    try {
      const response = await fetch(`/api/knowledge/${id}`, { method: 'DELETE', headers: authHeaders });
      if (response.ok) {
        fetchEntries();
        fetchStats();
        if (selectedEntry?.id === id) setSelectedEntry(null);
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      document: '📄',
      code: '💻',
      url: '🔗',
      note: '📝',
      conversation: '💬',
    };
    return icons[type] || '📁';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      document: 'bg-blue-500/20 text-blue-400',
      code: 'bg-green-500/20 text-green-400',
      url: 'bg-purple-500/20 text-purple-400',
      note: 'bg-yellow-500/20 text-yellow-400',
      conversation: 'bg-pink-500/20 text-pink-400',
    };
    return colors[type] || 'bg-vestara-glass text-vestara-text-dim';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-vestara-blue text-lg">Loading knowledge base...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 md:p-6">
      <div className="w-full flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-vestara-text">Knowledge Base</h1>
            <p className="text-vestara-text-dim mt-1">Store documents, code, and notes for AI context</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-vestara-blue rounded-lg hover:bg-vestara-blue/80 transition-colors"
          >
            Add Entry
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8 flex-shrink-0">
            <div className="bg-vestara-surface border border-vestara-glass-border rounded-lg p-4">
              <div className="text-vestara-text-dim text-sm">Total Entries</div>
              <div className="text-2xl font-bold text-vestara-text mt-1">{stats.total}</div>
            </div>
            <div className="bg-vestara-surface border border-vestara-glass-border rounded-lg p-4">
              <div className="text-vestara-text-dim text-sm">Total Size</div>
              <div className="text-2xl font-bold text-vestara-text mt-1">{formatSize(stats.totalSize)}</div>
            </div>
            <div className="bg-vestara-surface border border-vestara-glass-border rounded-lg p-4">
              <div className="text-vestara-text-dim text-sm">Types</div>
              <div className="text-2xl font-bold text-vestara-text mt-1">{Object.keys(stats.byType).length}</div>
            </div>
            <div className="bg-vestara-surface border border-vestara-glass-border rounded-lg p-4">
              <div className="text-vestara-text-dim text-sm">Avg Size</div>
              <div className="text-2xl font-bold text-vestara-text mt-1">
                {stats.total > 0 ? formatSize(stats.totalSize / stats.total) : '0 B'}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-4 mb-6 flex-shrink-0">
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchEntries()}
            className="flex-1 px-4 py-2 bg-vestara-surface border border-vestara-glass-border rounded-lg focus:outline-none focus:border-vestara-blue"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-vestara-surface border border-vestara-glass-border rounded-lg focus:outline-none focus:border-vestara-blue"
          >
            <option value="">All Types</option>
            <option value="document">Document</option>
            <option value="code">Code</option>
            <option value="url">URL</option>
            <option value="note">Note</option>
            <option value="conversation">Conversation</option>
          </select>
          <button
            onClick={searchEntries}
            className="px-6 py-2 bg-vestara-blue rounded-lg hover:bg-vestara-blue/80 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Entry List */}
          <div className="col-span-1 space-y-3 flex-1 min-h-0 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-vestara-text-dim">
                No entries found. Add one to get started.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`bg-vestara-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id
                      ? 'border-vestara-blue'
                      : 'border-vestara-glass-border hover:border-vestara-glass'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{getTypeIcon(entry.type)}</span>
                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(entry.type)}`}>
                      {entry.type}
                    </span>
                  </div>
                  <h3 className="font-medium text-vestara-text truncate">{entry.title}</h3>
                  <p className="text-vestara-text-dim text-sm mt-1 line-clamp-2">{entry.content}</p>
                  {entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-vestara-glass rounded text-xs text-vestara-text-dim">
                          {tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-xs text-vestara-text-dim/60">+{entry.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Entry Detail */}
          <div className="col-span-2 flex-1 min-h-0">
            {selectedEntry ? (
              <div className="bg-vestara-surface border border-vestara-glass-border rounded-lg p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span>{getTypeIcon(selectedEntry.type)}</span>
                    <h2 className="text-xl font-bold text-vestara-text">{selectedEntry.title}</h2>
                  </div>
                  <button
                    onClick={() => deleteEntry(selectedEntry.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
                <div className="flex gap-2 mb-4 flex-shrink-0">
                  <span className={`px-2 py-1 rounded text-xs ${getTypeColor(selectedEntry.type)}`}>
                    {selectedEntry.type}
                  </span>
                  {selectedEntry.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-vestara-glass rounded text-xs text-vestara-text-dim">
                      {tag}
                    </span>
                  ))}
                </div>
                {selectedEntry.source && (
                  <div className="text-vestara-text-dim text-sm mb-4 flex-shrink-0">
                    Source: <a href={selectedEntry.source} target="_blank" rel="noopener noreferrer" className="text-vestara-blue hover:underline">{selectedEntry.source}</a>
                  </div>
                )}
                <div className="bg-vestara-bg rounded-lg p-4 text-vestara-text whitespace-pre-wrap flex-1 overflow-auto">
                  {selectedEntry.content}
                </div>
                <div className="text-vestara-text-dim text-sm mt-4 flex-shrink-0">
                  Created: {new Date(selectedEntry.createdAt).toLocaleDateString()}
                  {' · '}
                  Updated: {new Date(selectedEntry.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="bg-vestara-surface border border-vestara-glass-border rounded-lg p-6 flex items-center justify-center flex-1">
                <div className="text-vestara-text-dim">Select an entry to view details</div>
              </div>
            )}
          </div>
        </div>

        {/* Add Entry Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-vestara-surface border border-vestara-glass-border rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4 text-vestara-text">Add Knowledge Entry</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-vestara-text-dim mb-1">Type</label>
                  <select
                    value={newEntry.type}
                    onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg"
                  >
                    <option value="note">Note</option>
                    <option value="document">Document</option>
                    <option value="code">Code</option>
                    <option value="url">URL</option>
                    <option value="conversation">Conversation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-vestara-text-dim mb-1">Title</label>
                  <input
                    type="text"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                    className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg"
                    placeholder="Entry title"
                  />
                </div>
                <div>
                  <label className="block text-sm text-vestara-text-dim mb-1">Content</label>
                  <textarea
                    value={newEntry.content}
                    onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                    className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg h-32"
                    placeholder="Content to store..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-vestara-text-dim mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newEntry.tags}
                    onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg"
                    placeholder="ai, research, important"
                  />
                </div>
                <div>
                  <label className="block text-sm text-vestara-text-dim mb-1">Source URL (optional)</label>
                  <input
                    type="text"
                    value={newEntry.source}
                    onChange={(e) => setNewEntry({ ...newEntry, source: e.target.value })}
                    className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-vestara-glass border border-vestara-glass-border rounded-lg hover:bg-vestara-surface"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addEntry}
                    className="flex-1 px-4 py-2 bg-vestara-blue rounded-lg hover:bg-vestara-blue/80"
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
