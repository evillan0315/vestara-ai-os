import { useState } from 'react';

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  tags: string;
  estimatedHours: string;
  parentId?: string;
}

interface TaskFormProps {
  title: string;
  initial: TaskFormData;
  onSave: (data: any) => void;
  onClose: () => void;
}

export function TaskForm({ title, initial, onSave, onClose }: TaskFormProps) {
  const [data, setData] = useState<TaskFormData>(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.title.trim()) return;
    onSave({
      title: data.title.trim(),
      description: data.description || undefined,
      status: data.status,
      parentId: initial.parentId || undefined,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="glass rounded-lg p-5 md:p-6 w-full max-w-lg mx-3 border border-vestara-glass-border" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg md:text-xl font-bold text-vestara-text mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs md:text-sm text-vestara-text-muted mb-1">Title</label>
            <input
              type="text" value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text"
              placeholder="Task title" autoFocus
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm text-vestara-text-muted mb-1">Description</label>
            <textarea
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg h-20 text-sm text-vestara-text"
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs md:text-sm text-vestara-text-muted mb-1">Status</label>
              <select value={data.status} onChange={(e) => setData({ ...data, status: e.target.value })}
                className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-xs md:text-sm text-vestara-text-muted mb-1">Est. Hours</label>
              <input type="number" value={data.estimatedHours} min="0" step="0.5"
                onChange={(e) => setData({ ...data, estimatedHours: e.target.value })}
                className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text"
                placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs md:text-sm text-vestara-text-muted mb-1">Tags (comma-separated)</label>
            <input type="text" value={data.tags}
              onChange={(e) => setData({ ...data, tags: e.target.value })}
              className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text"
              placeholder="bug, feature, ui" />
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
