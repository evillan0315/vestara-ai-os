import { useState, useCallback, useEffect } from 'react';
import { useSWR } from './useSWR';

export interface ProjectData {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  path: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskData {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  assignee_id: string | null;
  parent_id: string | null;
  tags: string[];
  estimated_hours: number | null;
  logged_hours: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
}

export interface ActivityEntry {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VestaraData {
  exists: boolean;
  config?: any;
  stats?: { tasks: number; conversations: number; opencodeChats: number };
}

type ViewMode = 'list' | 'kanban' | 'activity';

export function useProjects(token: string | null) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { data: projects, loading: projectsLoading, revalidate: revalidateProjects } = useSWR<ProjectData[]>(
    token ? 'projects' : null,
    () => fetch('/api/projects', { headers }).then(r => r.json()).then(d => d.projects),
  );

  const { data: stats, revalidate: revalidateStats } = useSWR<ProjectStats>(
    token ? 'projects-stats' : null,
    () => fetch('/api/projects/stats', { headers }).then(r => r.json()),
  );

  const { data: tasks, loading: tasksLoading, revalidate: revalidateTasks } = useSWR<TaskData[]>(
    selectedProjectId ? `tasks-${selectedProjectId}` : null,
    () => fetch(`/api/projects/${selectedProjectId}/tasks`, { headers }).then(r => r.json()).then(d => d.tasks),
  );

  const { data: activity, revalidate: revalidateActivity } = useSWR<ActivityEntry[]>(
    selectedProjectId ? `activity-${selectedProjectId}` : null,
    () => fetch(`/api/projects/${selectedProjectId}/activity`, { headers }).then(r => r.json()).then(d => d.activity),
  );

  const { data: vestaraData, revalidate: revalidateVestara } = useSWR<VestaraData>(
    selectedProjectId ? `vestara-${selectedProjectId}` : null,
    () => fetch(`/api/projects/${selectedProjectId}/vestara`, { headers }).then(r => r.json()),
  );

  const selectedProject = projects?.find(p => p.id === selectedProjectId) || null;
  const loading = !projects && projectsLoading;

  const selectProject = useCallback((id: string | null) => {
    setSelectedProjectId(id);
    setSelectedTaskIds(new Set());
  }, []);

  const revalidateAll = useCallback(() => {
    revalidateProjects();
    revalidateStats();
  }, [revalidateProjects, revalidateStats]);

  const createProject = useCallback(async (data: { name: string; description?: string; path?: string }) => {
    const res = await fetch('/api/projects', {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (res.ok) { revalidateAll(); return (await res.json()).project; }
    throw new Error(await res.text());
  }, [headers, revalidateAll]);

  const updateProject = useCallback(async (id: string, data: { name?: string; description?: string; status?: string }) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH', headers, body: JSON.stringify(data),
    });
    if (res.ok) { revalidateAll(); return (await res.json()).project; }
    throw new Error(await res.text());
  }, [headers, revalidateAll]);

  const deleteProject = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE', headers,
    });
    if (res.ok) { if (selectedProjectId === id) selectProject(null); revalidateAll(); return; }
    throw new Error(await res.text());
  }, [headers, selectedProjectId, selectProject, revalidateAll]);

  const cloneProject = useCallback(async (id: string, data: { name: string; includeTasks?: boolean }) => {
    const res = await fetch(`/api/projects/${id}/clone`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (res.ok) { revalidateAll(); return (await res.json()).project; }
    throw new Error(await res.text());
  }, [headers, revalidateAll]);

  const archiveProject = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}/archive`, {
      method: 'POST', headers,
    });
    if (res.ok) { revalidateAll(); selectProject(null); return; }
    throw new Error(await res.text());
  }, [headers, revalidateAll, selectProject]);

  const createTask = useCallback(async (data: {
    title: string; description?: string; status?: string;
    assigneeId?: string; parentId?: string; tags?: string[]; estimatedHours?: number;
  }) => {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/projects/${selectedProjectId}/tasks`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (res.ok) { revalidateTasks(); revalidateStats(); return (await res.json()).task; }
    throw new Error(await res.text());
  }, [selectedProjectId, headers, revalidateTasks, revalidateStats]);

  const updateTask = useCallback(async (taskId: string, data: {
    title?: string; description?: string; status?: string;
    assigneeId?: string; parentId?: string; tags?: string[];
    estimatedHours?: number; loggedHours?: number; sortOrder?: number;
  }) => {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/projects/${selectedProjectId}/tasks/${taskId}`, {
      method: 'PATCH', headers, body: JSON.stringify(data),
    });
    if (res.ok) { revalidateTasks(); revalidateStats(); return (await res.json()).task; }
    throw new Error(await res.text());
  }, [selectedProjectId, headers, revalidateTasks, revalidateStats]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/projects/${selectedProjectId}/tasks/${taskId}`, {
      method: 'DELETE', headers,
    });
    if (res.ok) { revalidateTasks(); revalidateStats(); return; }
    throw new Error(await res.text());
  }, [selectedProjectId, headers, revalidateTasks, revalidateStats]);

  const bulkUpdateTasks = useCallback(async (ids: string[], data: { status?: string }) => {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/projects/${selectedProjectId}/tasks/bulk`, {
      method: 'POST', headers, body: JSON.stringify({ ids, ...data }),
    });
    if (res.ok) { revalidateTasks(); revalidateStats(); return; }
    throw new Error(await res.text());
  }, [selectedProjectId, headers, revalidateTasks, revalidateStats]);

  const syncToVestara = useCallback(async () => {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/projects/${selectedProjectId}/sync`, {
      method: 'POST', headers,
    });
    if (res.ok) { revalidateVestara(); return; }
    throw new Error(await res.text());
  }, [selectedProjectId, headers, revalidateVestara]);

  const importFromVestara = useCallback(async () => {
    if (!selectedProjectId) return;
    const res = await fetch(`/api/projects/${selectedProjectId}/import`, {
      method: 'POST', headers,
    });
    if (res.ok) { revalidateTasks(); revalidateVestara(); revalidateStats(); return; }
    throw new Error(await res.text());
  }, [selectedProjectId, headers, revalidateTasks, revalidateVestara, revalidateStats]);

  const toggleTaskSelection = useCallback((id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedTaskIds(new Set()), []);

  const filteredProjects = projects?.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  }) || [];

  return {
    projects: filteredProjects, stats, selectedProject, tasks: tasks || [],
    activity: activity || [], vestaraData: vestaraData || null,
    loading, projectsLoading, tasksLoading,
    viewMode, setViewMode, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    selectedProjectId, selectProject,
    selectedTaskIds, toggleTaskSelection, clearSelection,
    createProject, updateProject, deleteProject, cloneProject, archiveProject,
    createTask, updateTask, deleteTask, bulkUpdateTasks,
    syncToVestara, importFromVestara,
    revalidateAll, revalidateTasks, revalidateVestara,
  };
}
