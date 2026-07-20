import { useState, useEffect } from 'react';

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
      const response = await fetch('/api/knowledge?limit=50');
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
      const response = await fetch('/api/knowledge/stats');
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
      const response = await fetch(`/api/knowledge/search?query=${encodeURIComponent(searchQuery)}&type=${filterType}`);
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
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
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
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-[#4a9eff] text-lg">Loading knowledge base...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
            <p className="text-gray-400 mt-1">Store documents, code, and notes for AI context</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef] transition-colors"
          >
            Add Entry
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Entries</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Size</div>
              <div className="text-2xl font-bold text-white mt-1">{formatSize(stats.totalSize)}</div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Types</div>
              <div className="text-2xl font-bold text-white mt-1">{Object.keys(stats.byType).length}</div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Avg Size</div>
              <div className="text-2xl font-bold text-white mt-1">
                {stats.total > 0 ? formatSize(stats.totalSize / stats.total) : '0 B'}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchEntries()}
            className="flex-1 px-4 py-2 bg-[#12121e] border border-[#1e1e2e] rounded-lg focus:outline-none focus:border-[#4a9eff]"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-[#12121e] border border-[#1e1e2e] rounded-lg focus:outline-none focus:border-[#4a9eff]"
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
            className="px-6 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef] transition-colors"
          >
            Search
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Entry List */}
          <div className="col-span-1 space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No entries found. Add one to get started.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`bg-[#12121e] border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id
                      ? 'border-[#4a9eff]'
                      : 'border-[#1e1e2e] hover:border-[#2a2a3e]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{getTypeIcon(entry.type)}</span>
                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(entry.type)}`}>
                      {entry.type}
                    </span>
                  </div>
                  <h3 className="font-medium text-white truncate">{entry.title}</h3>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">{entry.content}</p>
                  {entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-[#1a1a2e] rounded text-xs text-gray-400">
                          {tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{entry.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Entry Detail */}
          <div className="col-span-2">
            {selectedEntry ? (
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span>{getTypeIcon(selectedEntry.type)}</span>
                    <h2 className="text-xl font-bold text-white">{selectedEntry.title}</h2>
                  </div>
                  <button
                    onClick={() => deleteEntry(selectedEntry.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-xs ${getTypeColor(selectedEntry.type)}`}>
                    {selectedEntry.type}
                  </span>
                  {selectedEntry.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-[#1a1a2e] rounded text-xs text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>
                {selectedEntry.source && (
                  <div className="text-gray-400 text-sm mb-4">
                    Source: <a href={selectedEntry.source} target="_blank" rel="noopener noreferrer" className="text-[#4a9eff] hover:underline">{selectedEntry.source}</a>
                  </div>
                )}
                <div className="bg-[#0a0a12] rounded-lg p-4 text-gray-300 whitespace-pre-wrap">
                  {selectedEntry.content}
                </div>
                <div className="text-gray-500 text-sm mt-4">
                  Created: {new Date(selectedEntry.createdAt).toLocaleDateString()}
                  {' · '}
                  Updated: {new Date(selectedEntry.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 flex items-center justify-center h-64">
                <div className="text-gray-500">Select an entry to view details</div>
              </div>
            )}
          </div>
        </div>

        {/* Add Entry Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">Add Knowledge Entry</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select
                    value={newEntry.type}
                    onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                  >
                    <option value="note">Note</option>
                    <option value="document">Document</option>
                    <option value="code">Code</option>
                    <option value="url">URL</option>
                    <option value="conversation">Conversation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                    placeholder="Entry title"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Content</label>
                  <textarea
                    value={newEntry.content}
                    onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg h-32"
                    placeholder="Content to store..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newEntry.tags}
                    onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                    placeholder="ai, research, important"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Source URL (optional)</label>
                  <input
                    type="text"
                    value={newEntry.source}
                    onChange={(e) => setNewEntry({ ...newEntry, source: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                    placeholder="https://..."
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
                    onClick={addEntry}
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
