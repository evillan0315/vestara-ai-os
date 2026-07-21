import { useState } from 'react';
import type { ProjectData } from '../hooks/useProjects';

interface ProjectCardProps {
  project: ProjectData;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClone: (project: ProjectData) => void;
  onArchive: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  searchQuery?: string;
  taskProgress?: { done: number; total: number };
}

const statusColors: Record<string, string> = {
  active: 'bg-vestara-success/20 text-vestara-success',
  paused: 'bg-vestara-warning/20 text-vestara-warning',
  archived: 'bg-vestara-text-dim/20 text-vestara-text-dim',
};

const statusDotColors: Record<string, string> = {
  active: 'bg-vestara-success',
  paused: 'bg-vestara-warning',
  archived: 'bg-vestara-text-dim',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

function highlightText(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? `<span class="search-highlight">${part}</span>`
      : part,
  ).join('');
}

export function ProjectCard({ project, selected, onSelect, onDelete, onClone, onArchive, onUpdateStatus, searchQuery = '', taskProgress }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const progressPct = taskProgress && taskProgress.total > 0 ? Math.round((taskProgress.done / taskProgress.total) * 100) : null;

  return (
    <div
      onClick={() => onSelect(project.id)}
      className={`project-card glass rounded-lg p-3 md:p-4 cursor-pointer border ${
        selected ? 'border-vestara-blue' : 'border-vestara-glass-border hover:border-vestara-text-dim/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColors[project.status] || 'bg-vestara-text-dim'}`} />
            <h3
              className="font-medium text-vestara-text truncate text-sm md:text-base"
              dangerouslySetInnerHTML={{ __html: highlightText(project.name, searchQuery) }}
            />
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] md:text-xs ${statusColors[project.status] || 'bg-vestara-text-dim/20 text-vestara-text-dim'}`}>
              {statusLabels[project.status] || project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-vestara-text-muted text-xs md:text-sm line-clamp-2">{project.description}</p>
          )}
          {project.path && (
            <p className="text-vestara-text-dim text-[10px] md:text-xs mt-1 truncate font-mono">{project.path}</p>
          )}
          {progressPct !== null && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-vestara-text-dim mb-0.5">
                <span>{taskProgress!.done}/{taskProgress!.total} tasks</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1 bg-vestara-bg rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPct === 100 ? 'bg-vestara-success' : 'bg-vestara-blue'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
          <div className="text-vestara-text-dim text-[10px] md:text-xs mt-1.5">
            {new Date(project.updated_at).toLocaleDateString()}
          </div>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded hover:bg-vestara-glass text-vestara-text-muted hover:text-vestara-text"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 glass rounded-lg py-1 min-w-[140px] border border-vestara-glass-border shadow-xl">
                <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(project.id, project.status === 'active' ? 'paused' : 'active'); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-vestara-text hover:bg-vestara-glass">
                  {project.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onClone(project); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-vestara-text hover:bg-vestara-glass">
                  Clone
                </button>
                <button onClick={(e) => { e.stopPropagation(); onArchive(project.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-vestara-text hover:bg-vestara-glass">
                  Archive
                </button>
                <div className="border-t border-vestara-glass-border my-1" />
                <button onClick={(e) => { e.stopPropagation(); onDelete(project.id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-vestara-error hover:bg-vestara-glass">
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
