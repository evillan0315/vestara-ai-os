import { useState, useCallback, useRef } from 'react';
import type { TaskData } from '../hooks/useProjects';

interface KanbanBoardProps {
  tasks: TaskData[];
  onUpdateTask: (id: string, data: any) => void;
  onStartEdit: (task: TaskData) => void;
  onDelete: (id: string) => void;
  onAddTask: (status: string) => void;
}

const columns = [
  { key: 'todo', label: 'To Do', color: 'border-t-vestara-blue', icon: '○' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-vestara-purple', icon: '◐' },
  { key: 'review', label: 'Review', color: 'border-t-vestara-warning', icon: '◑' },
  { key: 'done', label: 'Done', color: 'border-t-vestara-success', icon: '●' },
];

const statusColors: Record<string, string> = {
  todo: 'text-vestara-blue',
  in_progress: 'text-vestara-purple',
  review: 'text-vestara-warning',
  done: 'text-vestara-success',
};

const tagColorPalette = ['bg-vestara-blue/20 text-vestara-blue', 'bg-vestara-cyan/20 text-vestara-cyan',
  'bg-vestara-purple/20 text-vestara-purple', 'bg-vestara-warning/20 text-vestara-warning',
  'bg-vestara-success/20 text-vestara-success'];

const emptyMessages: Record<string, string> = {
  todo: 'No to-do items. Add one or drag from other columns.',
  in_progress: 'Nothing in progress. Drag a task here to start working.',
  review: 'No items to review. Drag completed work here.',
  done: 'No completed tasks yet. Drop finished work here.',
};

export function KanbanBoard({ tasks, onUpdateTask, onStartEdit, onDelete, onAddTask }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const dragNode = useRef<HTMLElement | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    dragNode.current = e.target as HTMLElement;
    setDragId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverCol(colKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, colKey: string) => {
    const related = e.relatedTarget as HTMLElement;
    if (!related || !e.currentTarget.contains(related)) {
      setDragOverCol(prev => prev === colKey ? null : prev);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (dragId && status !== 'done') {
      onUpdateTask(dragId, { status });
    } else if (dragId && status === 'done') {
      setJustCompleted(dragId);
      onUpdateTask(dragId, { status });
      setTimeout(() => setJustCompleted(null), 400);
    }
    setDragId(null);
  }, [dragId, onUpdateTask]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 view-fade-enter">
      {columns.map((col) => {
        const colTasks = tasks
          .filter(t => t.status === col.key && !t.parent_id)
          .sort((a, b) => a.sort_order - b.sort_order);
        const isOver = dragOverCol === col.key;

        return (
          <div
            key={col.key}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, col.key)}
            onDragLeave={(e) => handleDragLeave(e, col.key)}
            onDrop={(e) => handleDrop(e, col.key)}
            className={`glass rounded-lg border-t-2 ${col.color} flex flex-col min-h-[200px] md:min-h-[350px] transition-colors duration-200 ${
              isOver ? 'column-drag-over' : ''
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-vestara-glass-border">
              <div className="flex items-center gap-2">
                <span className="text-xs">{col.icon}</span>
                <h3 className="text-xs md:text-sm font-semibold uppercase tracking-wider text-vestara-text">
                  {col.label}
                </h3>
                <span className={`text-[10px] md:text-xs font-mono ${statusColors[col.key]}`}>
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => onAddTask(col.key)}
                className="text-xs text-vestara-text-dim hover:text-vestara-text p-1 rounded hover:bg-vestara-glass transition-colors"
                title={`Add task to ${col.label}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 1v12M1 7h12" />
                </svg>
              </button>
            </div>
            <div className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px] ${isOver ? 'bg-vestara-gold/5' : ''} transition-colors duration-200`}>
              {colTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 md:h-32 text-xs text-vestara-text-dim px-2 text-center">
                  <span className="text-lg mb-1 opacity-40">
                    {col.key === 'todo' ? '📝' : col.key === 'in_progress' ? '⚡' : col.key === 'review' ? '🔍' : '✅'}
                  </span>
                  <span>{emptyMessages[col.key]}</span>
                </div>
              ) : (
                colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onStartEdit(task)}
                    className={`kanban-card glass-sm rounded-lg p-2.5 md:p-3 cursor-grab active:cursor-grabbing hover:border-vestara-gold/40 border border-transparent transition-all ${
                      dragId === task.id ? 'opacity-40 border-vestara-gold shadow-lg shadow-vestara-gold/10' : ''
                    } ${justCompleted === task.id ? 'task-checkmark' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-vestara-text-dim cursor-grab shrink-0" title="Drag to reorder">
                          ⠿
                        </span>
                        <span className={`text-xs md:text-sm font-medium ${
                          task.status === 'done' ? 'line-through text-vestara-text-dim' : 'text-vestara-text'
                        }`}>
                          {task.title}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                        className="shrink-0 text-vestara-text-dim hover:text-vestara-error text-[10px] p-0.5 rounded hover:bg-vestara-error/10 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
                        {task.tags.slice(0, 3).map((tag, i) => (
                          <span key={tag} className={`px-1 py-0.5 rounded text-[9px] ${tagColorPalette[i % tagColorPalette.length]}`}>
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="text-[9px] text-vestara-text-dim">+{task.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 ml-5 text-[10px] text-vestara-text-dim">
                      {task.estimated_hours != null && <span>~{task.estimated_hours}h</span>}
                      {task.logged_hours > 0 && <span>⌚{task.logged_hours}h</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
