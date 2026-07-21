import { useState } from 'react';

interface ProjectFormData {
  name: string;
  description: string;
  path: string;
}

interface ProjectFormProps {
  title: string;
  initial: ProjectFormData;
  onSave: (data: ProjectFormData) => void;
  onClose: () => void;
  onBrowse: (currentPath: string) => void;
}

export function ProjectForm({ title, initial, onSave, onClose, onBrowse }: ProjectFormProps) {
  const [data, setData] = useState<ProjectFormData>(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="glass rounded-lg p-5 md:p-6 w-full max-w-lg mx-3 border border-vestara-glass-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg md:text-xl font-bold text-vestara-text mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs md:text-sm text-vestara-text-muted mb-1">Name</label>
            <input
              type="text" value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text"
              placeholder="Project name" autoFocus
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm text-vestara-text-muted mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg h-20 md:h-24 text-sm text-vestara-text"
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm text-vestara-text-muted mb-1">Path</label>
            <div className="flex gap-2">
              <input
                type="text" value={data.path}
                onChange={(e) => setData({ ...data, path: e.target.value })}
                className="flex-1 px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg font-mono text-xs md:text-sm text-vestara-text"
                placeholder="/path/to/project"
              />
              <button type="button" onClick={() => onBrowse(data.path)}
                className="px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg hover:bg-vestara-glass text-xs md:text-sm text-vestara-text-muted">
                Browse
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text hover:bg-vestara-glass">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 btn-gold text-sm">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
