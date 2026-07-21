import { useState, useRef } from 'react';
import type { TaskData } from '../hooks/useProjects';

interface TaskItemProps {
  task: TaskData;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onStartEdit: (task: TaskData) => void;
  onAddSubTask: (parentId: string) => void;
  subTasks?: TaskData[];
  depth?: number;
}

const statusColors: Record<string, string> = {
  todo: 'bg-vestara-blue/20 text-vestara-blue',
  in_progress: 'bg-vestara-purple/20 text-vestara-purple',
  review: 'bg-vestara-warning/20 text-vestara-warning',
  done: 'bg-vestara-success/20 text-vestara-success',
};

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const tagColors = ['bg-vestara-blue/20 text-vestara-blue', 'bg-vestara-cyan/20 text-vestara-cyan',
  'bg-vestara-purple/20 text-vestara-purple', 'bg-vestara-warning/20 text-vestara-warning',
  'bg-vestara-success/20 text-vestara-success', 'bg-vestara-gold/20 text-vestara-text'];

export function TaskItem({ task, selected, onToggleSelect, onUpdate, onDelete, onStartEdit, onAddSubTask, subTasks, depth = 0 }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [expanded, setExpanded] = useState(true);
  const [animateDone, setAnimateDone] = useState(false);
  const prevStatusRef = useRef(task.status);

  if (task.status === 'done' && prevStatusRef.current !== 'done') {
    setAnimateDone(true);
    setTimeout(() => setAnimateDone(false), 400);
  }
  prevStatusRef.current = task.status;

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, { title: editTitle });
    }
    setEditing(false);
  };

  return (
    <div style={{ marginLeft: depth * 16 }} className={animateDone ? 'task-checkmark' : ''}>
      <div className={`glass-sm rounded-lg p-2.5 md:p-3 transition-all duration-200 hover:border-vestara-text-dim/30 ${selected ? 'border-vestara-blue' : ''}`}>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(task.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 shrink-0 accent-vestara-gold"
          />
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditing(false); }}
                className="w-full bg-vestara-bg border border-vestara-glass-border rounded px-2 py-0.5 text-sm text-vestara-text"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {task.status === 'done' && (
                  <span className="text-vestara-success shrink-0">✓</span>
                )}
                <h4
                  className={`font-medium text-sm cursor-pointer hover:text-vestara-blue transition-colors ${
                    task.status === 'done' ? 'line-through text-vestara-text-dim' : 'text-vestara-text'
                  }`}
                  onClick={() => setEditing(true)}
                >
                  {task.title}
                </h4>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${statusColors[task.status]}`}>
                  {task.status === 'done' ? '✓ Done' : statusLabels[task.status]}
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {task.tags?.map((tag, i) => (
                <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] ${tagColors[i % tagColors.length]}`}>
                  {tag}
                </span>
              ))}
              {task.estimated_hours != null && (
                <span className="text-[10px] text-vestara-text-dim">
                  ~{task.estimated_hours}h
                </span>
              )}
              {task.logged_hours > 0 && (
                <span className="text-[10px] text-vestara-text-muted">
                  ⌚{task.logged_hours}h
                </span>
              )}
              {task.parent_id && (
                <span className="text-[10px] text-vestara-text-dim">⊞ sub</span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <select
              value={task.status}
              onChange={(e) => onUpdate(task.id, { status: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs bg-vestara-bg border border-vestara-glass-border ${statusColors[task.status]} cursor-pointer`}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
            {!task.parent_id && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddSubTask(task.id); }}
                className="px-1.5 py-0.5 text-[10px] md:text-xs text-vestara-text-dim hover:text-vestara-text hover:bg-vestara-glass rounded transition-colors"
                title="Add sub-task"
              >
                ⊕
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onStartEdit(task); }}
              className="px-1.5 py-0.5 text-[10px] md:text-xs text-vestara-text-muted hover:text-vestara-text hover:bg-vestara-glass rounded transition-colors"
            >
              ✎
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="px-1.5 py-0.5 text-[10px] md:text-xs text-vestara-error hover:text-vestara-error/80 hover:bg-vestara-error/10 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      {subTasks && subTasks.length > 0 && (
        <div className="ml-4 mt-1 space-y-1 border-l border-vestara-glass-border pl-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] md:text-xs text-vestara-text-dim hover:text-vestara-text-muted mb-1 transition-colors"
          >
            {expanded ? '▾' : '▸'} {subTasks.length} sub-task{subTasks.length > 1 ? 's' : ''}
          </button>
          {expanded && subTasks.map(st => (
            <TaskItem
              key={st.id} task={st} selected={false}
              onToggleSelect={() => {}} onUpdate={onUpdate}
              onDelete={onDelete} onStartEdit={onStartEdit}
              onAddSubTask={onAddSubTask} depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
