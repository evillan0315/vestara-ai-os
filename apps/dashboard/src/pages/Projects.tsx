import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useProjects, type ProjectData, type TaskData } from '../hooks/useProjects';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DirectoryBrowser } from '../components/DirectoryBrowser';
import { StatsBar } from '../components/StatsBar';
import { ProjectCard } from '../components/ProjectCard';
import { TaskItem } from '../components/TaskItem';
import { BulkActions } from '../components/BulkActions';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProjectListSkeleton, StatsBarSkeleton, TaskListSkeleton } from '../components/LoadingSkeleton';

const KanbanBoard = lazy(() => import('../components/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
const ProjectForm = lazy(() => import('../components/ProjectForm').then(m => ({ default: m.ProjectForm })));
const TaskForm = lazy(() => import('../components/TaskForm').then(m => ({ default: m.TaskForm })));

type SortKey = 'name' | 'updated' | 'status';

export default function Projects() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const {
    projects, stats, selectedProject, tasks, activity, vestaraData,
    loading, tasksLoading,
    viewMode, setViewMode, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    selectedProjectId, selectProject,
    selectedTaskIds, toggleTaskSelection, clearSelection,
    createProject, updateProject, deleteProject, cloneProject, archiveProject,
    createTask, updateTask, deleteTask, bulkUpdateTasks,
    syncToVestara, importFromVestara, revalidateAll, revalidateVestara,
  } = useProjects(token);

  const [syncing, setSyncing] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskStatus, setAddTaskStatus] = useState('todo');
  const [addTaskParentId, setAddTaskParentId] = useState<string | undefined>();
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [showClone, setShowClone] = useState<ProjectData | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserEntries, setBrowserEntries] = useState<{ name: string; path: string; type: 'file' | 'directory' | 'symlink'; icon: string }[]>([]);
  const [narrowMode, setNarrowMode] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'project' | 'task'; id: string } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      setNarrowMode(entry.contentRect.width < 700);
    });
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setShowAddProject(true);
      }
      if (e.key === 'n' && (e.metaKey || e.ctrlKey) && e.shiftKey && selectedProject) {
        e.preventDefault();
        setAddTaskStatus('todo'); setShowAddTask(true);
      }
      if (e.key === 'Escape') {
        setConfirmDelete(null);
        setConfirmArchive(null);
        setShowClone(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedProject]);

  const loadBrowserDir = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBrowserPath(data.path || '');
        setBrowserEntries((data.entries || []).filter((e: any) => e.type === 'directory').map((e: any) => ({ ...e, type: e.type as 'file' | 'directory' | 'symlink' })));
      }
    } catch {}
  }, [token]);

  const openBrowser = useCallback((currentPath?: string) => {
    loadBrowserDir(currentPath || '');
    setShowBrowser(true);
  }, [loadBrowserDir]);

  const handleCreateProject = useCallback(async (data: { name: string; description: string; path: string }) => {
    try { await createProject(data); setShowAddProject(false); addToast('Project created'); }
    catch { addToast('Failed to create project', 'error'); }
  }, [createProject, addToast]);

  const handleUpdateProject = useCallback(async (data: { name: string; description: string; path: string }) => {
    if (!editingProject) return;
    try { await updateProject(editingProject.id, data); setEditingProject(null); addToast('Project updated'); }
    catch { addToast('Failed to update project', 'error'); }
  }, [editingProject, updateProject, addToast]);

  const handleDeleteProject = useCallback(async (id: string) => {
    try { await deleteProject(id); setConfirmDelete(null); addToast('Project deleted'); }
    catch { addToast('Failed to delete project', 'error'); }
  }, [deleteProject, addToast]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try { await deleteTask(taskId); setConfirmDelete(null); addToast('Task deleted'); }
    catch { addToast('Failed to delete task', 'error'); }
  }, [deleteTask, addToast]);

  const handleCloneProject = useCallback(async () => {
    if (!showClone || !cloneName.trim()) return;
    try { await cloneProject(showClone.id, { name: cloneName }); setShowClone(null); setCloneName(''); addToast('Project cloned'); }
    catch { addToast('Failed to clone project', 'error'); }
  }, [showClone, cloneName, cloneProject, addToast]);

  const handleArchiveProject = useCallback(async (id: string) => {
    try { await archiveProject(id); setConfirmArchive(null); addToast('Project archived'); }
    catch { addToast('Failed to archive project', 'error'); }
  }, [archiveProject, addToast]);

  const handleUpdateStatus = useCallback(async (id: string, status: string) => {
    try { await updateProject(id, { status }); addToast('Status updated'); }
    catch { addToast('Failed to update status', 'error'); }
  }, [updateProject, addToast]);

  const handleCreateTask = useCallback(async (data: any) => {
    try { await createTask(data); setShowAddTask(false); setAddTaskParentId(undefined); addToast('Task created'); }
    catch { addToast('Failed to create task', 'error'); }
  }, [createTask, addToast]);

  const handleUpdateTask = useCallback(async (taskId: string, data: any) => {
    try { await updateTask(taskId, data); }
    catch { addToast('Failed to update task', 'error'); }
  }, [updateTask, addToast]);

  const handleBulkStatus = useCallback(async (status: string) => {
    try { await bulkUpdateTasks(Array.from(selectedTaskIds), { status }); clearSelection(); addToast(`Updated ${selectedTaskIds.size} tasks`); }
    catch { addToast('Failed to update tasks', 'error'); }
  }, [selectedTaskIds, bulkUpdateTasks, clearSelection, addToast]);

  const handleSync = useCallback(async () => {
    if (!selectedProject) return;
    setSyncing(true);
    try { await syncToVestara(); addToast('Synced to .vestara'); }
    catch { addToast('Sync failed', 'error'); }
    finally { setSyncing(false); }
  }, [selectedProject, syncToVestara, addToast]);

  const handleImport = useCallback(async () => {
    if (!selectedProject) return;
    setSyncing(true);
    try { await importFromVestara(); addToast('Imported from .vestara'); }
    catch { addToast('Import failed', 'error'); }
    finally { setSyncing(false); }
  }, [selectedProject, importFromVestara, addToast]);

  const openProjectFiles = useCallback((project: ProjectData) => {
    navigate(project.path ? `/files?path=${encodeURIComponent(project.path)}` : '/files');
  }, [navigate]);

  const taskStatusCounts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
  };
  const totalTasksCount = tasks.length;

  const rootTasks = tasks.filter(t => !t.parent_id);
  const getSubTasks = (parentId: string) => tasks.filter(t => t.parent_id === parentId);
  const selectAll = useCallback(() => {
    if (selectedTaskIds.size === rootTasks.length) clearSelection();
    else rootTasks.forEach(t => toggleTaskSelection(t.id));
  }, [selectedTaskIds.size, rootTasks, clearSelection, toggleTaskSelection]);

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name);
    if (sortKey === 'status') return a.status.localeCompare(b.status);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const taskProgress = selectedProject ? {
    done: taskStatusCounts.done,
    total: totalTasksCount,
  } : undefined;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="max-w-6xl mx-auto">
          <div ref={headerRef} className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-vestara-text">Projects</h1>
              <p className="text-xs md:text-sm text-vestara-text-muted mt-0.5 md:mt-1">
                {selectedProject ? selectedProject.name : 'Manage projects and track tasks'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedProject && selectedProject.path && (
                <button onClick={() => openProjectFiles(selectedProject)}
                  className="px-2 md:px-3 py-1 md:py-1.5 bg-vestara-blue/20 text-vestara-blue border border-vestara-blue/30 rounded text-xs md:text-sm hover:bg-vestara-blue/30 transition-colors">
                  Open Files
                </button>
              )}
              <button onClick={() => setShowAddProject(true)}
                className="btn-gold text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
                + New Project
              </button>
            </div>
          </div>

          {loading ? <StatsBarSkeleton /> : <StatsBar stats={stats || null} />}

          {narrowMode && selectedProject && (
            <div className="glass rounded-lg p-3 mb-3 modal-content">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-sm text-vestara-text truncate">{selectedProject.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedProject.status === 'active' ? 'bg-vestara-success' : selectedProject.status === 'paused' ? 'bg-vestara-warning' : 'bg-vestara-text-dim'}`} />
                    <p className="text-xs text-vestara-text-dim truncate">{selectedProject.description || 'No description'}</p>
                  </div>
                </div>
                <button onClick={() => selectProject(null)}
                  className="ml-2 text-xs text-vestara-text-dim hover:text-vestara-text shrink-0 p-1 hover:bg-vestara-glass rounded transition-colors">
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
            <div className={`${narrowMode && selectedProject ? 'hidden' : 'block'} lg:block`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-vestara-text-dim" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
                  </svg>
                  <input
                    type="text" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..." autoComplete="off"
                    className="w-full pl-7 pr-2 py-1.5 bg-vestara-bg border border-vestara-glass-border rounded text-xs md:text-sm text-vestara-text placeholder-vestara-text-dim/50"
                  />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 bg-vestara-bg border border-vestara-glass-border rounded text-xs text-vestara-text-muted">
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-[10px] md:text-xs font-semibold text-vestara-text-muted uppercase tracking-wider">
                  Projects ({projects.length})
                </h2>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="text-[10px] bg-transparent text-vestara-text-dim border-none cursor-pointer outline-none hover:text-vestara-text-muted">
                  <option value="updated">Recent</option>
                  <option value="name">A-Z</option>
                  <option value="status">Status</option>
                </select>
              </div>
              {loading ? <ProjectListSkeleton /> : projects.length === 0 ? (
                <div className="text-center py-12 text-vestara-text-dim text-xs md:text-sm">
                  <div className="text-3xl mb-3 opacity-30">📋</div>
                  {searchQuery || statusFilter ? (
                    <p>No projects match your search</p>
                  ) : (
                    <>
                      <p className="mb-3">No projects yet</p>
                      <button onClick={() => setShowAddProject(true)} className="btn-gold text-xs px-3 py-1.5">
                        Create your first project
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 md:space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 scroll-smooth">
                  {sortedProjects.map((project) => (
                    <ProjectCard
                      key={project.id} project={project}
                      selected={selectedProject?.id === project.id}
                      onSelect={selectProject}
                      onDelete={(id) => setConfirmDelete({ type: 'project', id })}
                      onClone={setShowClone}
                      onArchive={setConfirmArchive}
                      onUpdateStatus={handleUpdateStatus}
                      searchQuery={searchQuery}
                      taskProgress={taskProgress}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedProject ? (
                <div className="glass rounded-lg p-3 md:p-5 border border-vestara-glass-border view-fade-enter">
                  {!narrowMode && (
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${selectedProject.status === 'active' ? 'bg-vestara-success' : selectedProject.status === 'paused' ? 'bg-vestara-warning' : 'bg-vestara-text-dim'}`} />
                          <h2 className="text-lg md:text-xl font-bold text-vestara-text truncate">{selectedProject.name}</h2>
                        </div>
                        {selectedProject.description && (
                          <p className="text-xs md:text-sm text-vestara-text-muted mt-0.5 ml-4">{selectedProject.description}</p>
                        )}
                        {vestaraData?.exists && (
                          <div className="flex items-center gap-2 mt-1.5 ml-4 text-[10px] md:text-xs text-vestara-text-dim">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-vestara-purple/10 text-vestara-purple rounded">
                              .vestara
                            </span>
                            {vestaraData.stats && (
                              <span>{vestaraData.stats.tasks} tasks · {vestaraData.stats.conversations} convs</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 md:gap-2 flex-wrap">
                        {selectedProject.path && (
                          <button onClick={handleSync} disabled={syncing}
                            className={`px-2 md:px-3 py-1 rounded text-xs border transition-colors ${
                              syncing ? 'bg-vestara-purple/10 text-vestara-purple/50 border-vestara-purple/10 syncing' : 'bg-vestara-purple/20 text-vestara-purple border-vestara-purple/30 hover:bg-vestara-purple/30'
                            }`}>
                            {syncing ? '⟳' : '↓ Sync'}
                          </button>
                        )}
                        {vestaraData?.exists && (
                          <button onClick={handleImport} disabled={syncing}
                            className="px-2 md:px-3 py-1 bg-vestara-warning/20 text-vestara-warning border border-vestara-warning/30 rounded text-xs hover:bg-vestara-warning/30 transition-colors disabled:opacity-50">
                            ↑ Import
                          </button>
                        )}
                        <select value={selectedProject.status}
                          onChange={(e) => handleUpdateStatus(selectedProject.id, e.target.value)}
                          className="px-2 py-1 bg-vestara-bg border border-vestara-glass-border rounded text-xs text-vestara-text cursor-pointer">
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Archived</option>
                        </select>
                        <button onClick={() => { setEditingProject(selectedProject); }}
                          className="px-2 md:px-3 py-1 bg-vestara-bg border border-vestara-glass-border rounded text-xs text-vestara-text-muted hover:bg-vestara-glass transition-colors">
                          Edit
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1 md:gap-2">
                      {(['list', 'kanban', 'activity'] as const).map((mode) => (
                        <button key={mode}
                          onClick={() => setViewMode(mode)}
                          className={`px-2 md:px-3 py-1 rounded text-[10px] md:text-xs capitalize transition-all ${
                            viewMode === mode ? 'bg-vestara-blue text-white shadow-sm shadow-vestara-blue/30' : 'bg-vestara-bg text-vestara-text-muted hover:bg-vestara-glass'
                          }`}>
                          {mode === 'list' ? '☰' : mode === 'kanban' ? '☷' : '◷'} {mode === 'list' ? 'List' : mode === 'kanban' ? 'Board' : 'Activity'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      {viewMode === 'list' && totalTasksCount > 0 && (
                        <span className="text-[10px] md:text-xs text-vestara-text-dim font-mono">
                          {taskStatusCounts.done}/{totalTasksCount}
                        </span>
                      )}
                      <button onClick={() => { setAddTaskStatus('todo'); setAddTaskParentId(undefined); setShowAddTask(true); }}
                        className="px-2 md:px-3 py-1 bg-vestara-blue rounded text-[10px] md:text-xs text-white hover:bg-vestara-blue/80 transition-colors">
                        + Task
                      </button>
                    </div>
                  </div>

                  <BulkActions
                    selectedCount={selectedTaskIds.size}
                    totalCount={rootTasks.length}
                    onStatusChange={handleBulkStatus}
                    onClear={clearSelection}
                    onSelectAll={selectAll}
                  />

                  {viewMode === 'list' && (
                    <>
                      {tasksLoading ? <TaskListSkeleton /> : rootTasks.length === 0 ? (
                        <div className="text-center py-10 text-vestara-text-dim text-xs md:text-sm view-fade-enter">
                          <span className="text-2xl block mb-2 opacity-30">
                            {tasks.length === 0 ? '📝' : '🔍'}
                          </span>
                          {tasks.length === 0 ? 'No tasks yet. Add one to get started.' : 'No tasks match the filter.'}
                        </div>
                      ) : (
                        <div className="space-y-1.5 md:space-y-2 mt-2">
                          {rootTasks.map((task) => (
                            <TaskItem
                              key={task.id} task={task}
                              selected={selectedTaskIds.has(task.id)}
                              onToggleSelect={toggleTaskSelection}
                              onUpdate={handleUpdateTask}
                              onDelete={(id) => setConfirmDelete({ type: 'task', id })}
                              onStartEdit={setEditingTask}
                              onAddSubTask={(parentId) => { setAddTaskParentId(parentId); setAddTaskStatus('todo'); setShowAddTask(true); }}
                              subTasks={getSubTasks(task.id)}
                            />
                          ))}
                        </div>
                      )}
                      {!tasksLoading && totalTasksCount > 0 && (
                        <div className="flex items-center gap-1 md:gap-2 mt-3 flex-wrap">
                          {['', 'todo', 'in_progress', 'review', 'done'].map((status) => (
                            <button key={status}
                              onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
                              className={`px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs transition-all ${
                                statusFilter === status ? 'bg-vestara-blue text-white' : 'bg-vestara-bg text-vestara-text-muted hover:bg-vestara-glass'
                              }`}>
                              {status ? status.replace('_', ' ') : 'All'}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {viewMode === 'kanban' && (
                    <Suspense fallback={<TaskListSkeleton />}>
                      <KanbanBoard
                        tasks={tasks}
                        onUpdateTask={handleUpdateTask}
                        onStartEdit={setEditingTask}
                        onDelete={(id) => setConfirmDelete({ type: 'task', id })}
                        onAddTask={(status) => { setAddTaskStatus(status); setAddTaskParentId(undefined); setShowAddTask(true); }}
                      />
                    </Suspense>
                  )}

                  {viewMode === 'activity' && (
                    <ActivityTimeline activity={activity} loading={tasksLoading} />
                  )}
                </div>
              ) : (
                <div className="glass rounded-lg p-6 md:p-8 flex items-center justify-center min-h-[200px] md:min-h-[300px] border border-vestara-glass-border">
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl mb-4 opacity-20">📋</div>
                    <p className="text-vestara-text-dim text-sm md:text-base">Select a project to view its tasks</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showAddProject && (
          <Suspense fallback={null}>
            <ProjectForm title="New Project" initial={{ name: '', description: '', path: '' }}
              onSave={handleCreateProject} onClose={() => setShowAddProject(false)} onBrowse={openBrowser} />
          </Suspense>
        )}

        {editingProject && (
          <Suspense fallback={null}>
            <ProjectForm title="Edit Project"
              initial={{ name: editingProject.name, description: editingProject.description || '', path: editingProject.path || '' }}
              onSave={handleUpdateProject} onClose={() => setEditingProject(null)}
              onBrowse={(path) => { setEditingProject({ ...editingProject, path }); openBrowser(path); }} />
          </Suspense>
        )}

        {showAddTask && (
          <Suspense fallback={null}>
            <TaskForm title={addTaskParentId ? 'Add Sub-task' : 'New Task'}
              initial={{ title: '', description: '', status: addTaskStatus, tags: '', estimatedHours: '', parentId: addTaskParentId }}
              onSave={handleCreateTask} onClose={() => { setShowAddTask(false); setAddTaskParentId(undefined); }} />
          </Suspense>
        )}

        {editingTask && (
          <Suspense fallback={null}>
            <TaskForm title="Edit Task"
              initial={{ title: editingTask.title, description: editingTask.description || '', status: editingTask.status, tags: (editingTask.tags || []).join(', '), estimatedHours: editingTask.estimated_hours?.toString() || '', parentId: editingTask.parent_id || '' }}
              onSave={(data) => { handleUpdateTask(editingTask.id, data); setEditingTask(null); }}
              onClose={() => setEditingTask(null)} />
          </Suspense>
        )}

        {showClone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-overlay">
            <div className="modal-content glass rounded-lg p-5 md:p-6 w-full max-w-md mx-3 border border-vestara-glass-border">
              <h2 className="text-lg md:text-xl font-bold text-vestara-text mb-1">Clone Project</h2>
              <p className="text-xs md:text-sm text-vestara-text-muted mb-4">Clone "{showClone.name}"</p>
              <input type="text" value={cloneName} autoFocus
                onChange={(e) => setCloneName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCloneProject(); if (e.key === 'Escape') { setShowClone(null); setCloneName(''); } }}
                className="w-full px-3 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text mb-4"
                placeholder="New project name" />
              <div className="flex gap-3">
                <button onClick={() => { setShowClone(null); setCloneName(''); }}
                  className="flex-1 px-4 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text hover:bg-vestara-glass transition-colors">
                  Cancel
                </button>
                <button onClick={handleCloneProject} disabled={!cloneName.trim()}
                  className="flex-1 px-4 py-2 btn-gold text-sm disabled:opacity-50">
                  Clone
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmDelete !== null}
          title={confirmDelete?.type === 'project' ? 'Delete Project' : 'Delete Task'}
          message={confirmDelete?.type === 'project' ? 'Delete this project and all its tasks? This cannot be undone.' : 'Delete this task? This cannot be undone.'}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => {
            if (confirmDelete?.type === 'project') handleDeleteProject(confirmDelete.id);
            else if (confirmDelete?.type === 'task') handleDeleteTask(confirmDelete.id);
          }}
          onCancel={() => setConfirmDelete(null)}
        />

        <ConfirmDialog
          open={confirmArchive !== null}
          title="Archive Project"
          message="Archive this project to .vestara and mark it as archived?"
          confirmLabel="Archive"
          onConfirm={() => confirmArchive && handleArchiveProject(confirmArchive)}
          onCancel={() => setConfirmArchive(null)}
        />

        {showBrowser && (
          <DirectoryBrowser
            show={showBrowser} path={browserPath} entries={browserEntries}
            onLoadDir={loadBrowserDir}
            onSelect={(path) => {
              if (editingProject) setEditingProject({ ...editingProject, path });
              setShowBrowser(false);
            }}
            onClose={() => setShowBrowser(false)}
          />
        )}

      </div>
    </ErrorBoundary>
  );
}
