import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AgentStatus, AgentType, Agent } from '@vestara/types';
import { X } from 'lucide-react';

interface AgentConfigurationProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Agent>;
  onSave: (data: Partial<Agent>) => Promise<void>;
}

export function AgentConfiguration({ isOpen, onClose, initialData, onSave }: AgentConfigurationProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: AgentType.PLANNER,
    description: '',
    providerId: '',
    modelId: '',
    systemPrompt: '',
    tools: [] as string[],
    maxTokens: 1000,
    temperature: 0.7,
    tags: [] as string[],
    author: 'Vestara',
    isPublic: false,
    config: { tools: [] as string[] },
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save agent configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-vestara-surface rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-vestara-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-vestara-text">Configure Agent</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-vestara-surface/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-vestara-border">
          {['basic', 'model', 'advanced'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab
                ? 'text-vestara-gold border-b-2 border-vestara-gold'
                : 'text-vestara-text-muted hover:text-vestara-text'}
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
                  placeholder="Agent name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50 h-20 resize-none"
                  placeholder="Brief description of the agent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AgentType }))}
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
                >
                  {Object.values(AgentType).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Provider ID (optional)</label>
                <input
                  type="text"
                  value={formData.providerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, providerId: e.target.value }))}
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
                  placeholder="e.g., openai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Model ID (optional)</label>
                <input
                  type="text"
                  value={formData.modelId}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
                  placeholder="e.g., gpt-4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Temperature</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-vestara-text-muted mt-1">Current: {formData.temperature}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Max Tokens</label>
                <input
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
                  placeholder="1000"
                />
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">System Prompt</label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50 h-32 resize-none font-mono text-xs"
                  placeholder="You are a helpful AI assistant..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Tools</label>
                <div className="grid grid-cols-2 gap-2">
                  {['web_search', 'file_read', 'command_run', 'api_call', 'memory_access'].map((tool) => (
                    <label key={tool} className="flex items-center gap-2 p-2 border border-vestara-border rounded-lg cursor-pointer hover:bg-vestara-surface/50">
                      <input
                        type="checkbox"
                        checked={formData.tools.includes(tool)}
                        onChange={(e) => {
                          const tools = e.target.checked
                            ? [...formData.tools, tool]
                            : formData.tools.filter(t => t !== tool);
                          setFormData(prev => ({ ...prev, tools }));
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-vestara-text">{tool}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-vestara-text mb-2">Tags</label>
                <input
                  type="text"
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) }))}
                  className="w-full px-3 py-2 bg-vestara-surface border border-vestara-border rounded-lg text-vestara-text focus:outline-none focus:ring-2 focus:ring-vestara-gold/50"
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-sm text-vestara-text">Make public</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-vestara-text-muted hover:text-vestara-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-vestara-gold text-black rounded-lg text-sm font-medium hover:bg-vestara-gold/80 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
