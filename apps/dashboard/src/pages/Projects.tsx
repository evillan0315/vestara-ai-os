import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  path: string | null;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
}

export default function Projects() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newProject, setNewProject] = useState({ name: '', description: '', path: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo' });
  const [taskFilter, setTaskFilter] = useState<string>('');
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserEntries, setBrowserEntries] = useState<{ name: string; path: string; type: string; icon: string }[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject.id);
    }
  }, [selectedProject]);

  const loadBrowserDir = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBrowserPath(data.path || '');
        setBrowserEntries((data.entries || []).filter((e: any) => e.type === 'directory'));
      }
    } catch {}
  }, [token]);

  const openBrowser = (currentPath?: string) => {
    loadBrowserDir(currentPath || '');
    setShowBrowser(true);
  };

  const selectBrowserDir = (path: string) => {
    setNewProject(prev => ({ ...prev, path }));
    setShowBrowser(false);
  };

  const openProjectFiles = (project: Project) => {
    if (project.path) {
      navigate(`/files?path=${encodeURIComponent(project.path)}`);
    } else {
      navigate('/files');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/projects/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTasks = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) return;
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newProject),
      });
      if (response.ok) {
        setShowAddProject(false);
        setNewProject({ name: '', description: '', path: '' });
        fetchProjects();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const updateProject = async () => {
    if (!editingProject) return;
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newProject.name || editingProject.name,
          description: newProject.description,
        }),
      });
      if (response.ok) {
        setEditingProject(null);
        setNewProject({ name: '', description: '', path: '' });
        fetchProjects();
        if (selectedProject?.id === editingProject.id) {
          setSelectedProject({ ...editingProject, name: newProject.name || editingProject.name, description: newProject.description });
        }
      }
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        if (selectedProject?.id === id) {
          setSelectedProject(null);
          setTasks([]);
        }
        fetchProjects();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const updateProjectStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        fetchProjects();
        fetchStats();
        if (selectedProject?.id === id) {
          setSelectedProject(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      console.error('Failed to update project status:', error);
    }
  };

  const createTask = async () => {
    if (!selectedProject || !newTask.title.trim()) return;
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTask),
      });
      if (response.ok) {
        setShowAddTask(false);
        setNewTask({ title: '', description: '', status: 'todo' });
        fetchTasks(selectedProject.id);
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateTask = async () => {
    if (!selectedProject || !editingTask) return;
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newTask.title || editingTask.title,
          description: newTask.description,
          status: newTask.status,
        }),
      });
      if (response.ok) {
        setEditingTask(null);
        setNewTask({ title: '', description: '', status: 'todo' });
        fetchTasks(selectedProject.id);
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    if (!selectedProject) return;
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        fetchTasks(selectedProject.id);
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!selectedProject || !confirm('Delete this task?')) return;
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchTasks(selectedProject.id);
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400',
      paused: 'bg-yellow-500/20 text-yellow-400',
      archived: 'bg-gray-500/20 text-gray-400',
      todo: 'bg-blue-500/20 text-blue-400',
      in_progress: 'bg-purple-500/20 text-purple-400',
      review: 'bg-orange-500/20 text-orange-400',
      done: 'bg-green-500/20 text-green-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Active',
      paused: 'Paused',
      archived: 'Archived',
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done',
    };
    return labels[status] || status;
  };

  const filteredTasks = taskFilter
    ? tasks.filter(t => t.status === taskFilter)
    : tasks;

  const startEditProject = (project: Project) => {
    setEditingProject(project);
    setNewProject({ name: project.name, description: project.description || '', path: project.path || '' });
  };

  const startEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({ title: task.title, description: task.description || '', status: task.status });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-[#4a9eff] text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-gray-400 mt-1">Manage projects and track tasks</p>
          </div>
          <button
            onClick={() => setShowAddProject(true)}
            className="px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef] transition-colors"
          >
            New Project
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Projects</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Active</div>
              <div className="text-2xl font-bold text-green-400 mt-1">{stats.byStatus.active || 0}</div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Total Tasks</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.totalTasks}</div>
            </div>
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-4">
              <div className="text-gray-400 text-sm">Done</div>
              <div className="text-2xl font-bold text-green-400 mt-1">{stats.tasksByStatus.done || 0}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Projects</h2>
            {projects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No projects yet. Create one to get started.
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`bg-[#12121e] border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedProject?.id === project.id
                      ? 'border-[#4a9eff]'
                      : 'border-[#1e1e2e] hover:border-[#2a2a3e]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white truncate">{project.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-gray-400 text-sm line-clamp-2">{project.description}</p>
                  )}
                  {project.path && (
                    <p className="text-gray-500 text-xs mt-2 truncate">{project.path}</p>
                  )}
                  <div className="text-gray-500 text-xs mt-2">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="col-span-2">
            {selectedProject ? (
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedProject.name}</h2>
                    {selectedProject.description && (
                      <p className="text-gray-400 text-sm mt-1">{selectedProject.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedProject.path && (
                      <button
                        onClick={() => openProjectFiles(selectedProject)}
                        className="px-3 py-1 bg-[#4a9eff]/20 text-[#4a9eff] border border-[#4a9eff]/30 rounded text-sm hover:bg-[#4a9eff]/30"
                      >
                        Open
                      </button>
                    )}
                    <select
                      value={selectedProject.status}
                      onChange={(e) => updateProjectStatus(selectedProject.id, e.target.value)}
                      className="px-3 py-1 bg-[#0a0a12] border border-[#1e1e2e] rounded text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button
                      onClick={() => startEditProject(selectedProject)}
                      className="px-3 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded text-sm hover:bg-[#2a2a3e]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProject(selectedProject.id)}
                      className="px-3 py-1 text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    {['', 'todo', 'in_progress', 'review', 'done'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setTaskFilter(status)}
                        className={`px-3 py-1 rounded text-xs ${
                          taskFilter === status
                            ? 'bg-[#4a9eff] text-white'
                            : 'bg-[#1a1a2e] text-gray-400 hover:bg-[#2a2a3e]'
                        }`}
                      >
                        {status ? getStatusLabel(status) : 'All'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="px-4 py-1 bg-[#4a9eff] rounded text-sm hover:bg-[#3a8eef]"
                  >
                    Add Task
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {tasks.length === 0 ? 'No tasks yet. Add one to get started.' : 'No tasks match this filter.'}
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-[#0a0a12] border border-[#1e1e2e] rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-white truncate">{task.title}</h4>
                              <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status)}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-gray-400 text-sm line-clamp-1">{task.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-4">
                            {task.status !== 'done' && (
                              <select
                                value={task.status}
                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                className="px-2 py-1 bg-[#12121e] border border-[#1e1e2e] rounded text-xs"
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="done">Done</option>
                              </select>
                            )}
                            <button
                              onClick={() => startEditTask(task)}
                              className="px-2 py-1 text-gray-400 hover:text-white text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                            >
                              Del
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 flex items-center justify-center h-64">
                <div className="text-gray-500">Select a project to view tasks</div>
              </div>
            )}
          </div>
        </div>

        {showAddProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">New Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg h-24"
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Path (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProject.path}
                      onChange={(e) => setNewProject({ ...newProject, path: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg font-mono text-sm"
                      placeholder="/path/to/project"
                    />
                    <button
                      onClick={() => openBrowser(newProject.path || '')}
                      className="px-3 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e] text-sm"
                    >
                      Browse
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddProject(false)}
                    className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createProject}
                    className="flex-1 px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef]"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">Edit Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg h-24"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProject.path}
                      onChange={(e) => setNewProject({ ...newProject, path: e.target.value })}
                      className="flex-1 px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg font-mono text-sm"
                      placeholder="/path/to/project"
                    />
                    <button
                      onClick={() => openBrowser(newProject.path || '')}
                      className="px-3 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e] text-sm"
                    >
                      Browse
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingProject(null)}
                    className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateProject}
                    className="flex-1 px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">New Task</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg h-24"
                    placeholder="Optional description"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTask}
                    className="flex-1 px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef]"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">Edit Task</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg h-24"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a12] border border-[#1e1e2e] rounded-lg"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingTask(null)}
                    className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateTask}
                    className="flex-1 px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showBrowser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#12121e] border border-[#1e1e2e] rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
              <h2 className="text-xl font-bold mb-4">Select Directory</h2>
              <div className="flex items-center gap-2 mb-4 text-sm">
                <span className="text-gray-400">Current:</span>
                <span className="text-white font-mono">{browserPath || '~'}</span>
              </div>
              <div className="flex-1 overflow-y-auto border border-[#1e1e2e] rounded-lg bg-[#0a0a12] min-h-[300px]">
                {browserPath && (
                  <button
                    onClick={() => {
                      const parent = browserPath.substring(0, browserPath.lastIndexOf('/')) || '';
                      loadBrowserDir(parent);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-white/5 border-b border-[#1e1e2e] flex items-center gap-2"
                  >
                    <span>..</span>
                    <span className="text-gray-500">Parent directory</span>
                  </button>
                )}
                {browserEntries.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                    No subdirectories
                  </div>
                ) : (
                  browserEntries.map((entry) => (
                    <button
                      key={entry.path}
                      onClick={() => loadBrowserDir(entry.path)}
                      className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 border-b border-[#1e1e2e] flex items-center gap-2"
                    >
                      <span>{entry.icon || '📁'}</span>
                      <span className="font-mono">{entry.name}</span>
                    </button>
                  ))
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowBrowser(false)}
                  className="flex-1 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg hover:bg-[#2a2a3e]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectBrowserDir(browserPath)}
                  className="flex-1 px-4 py-2 bg-[#4a9eff] rounded-lg hover:bg-[#3a8eef]"
                >
                  Select This Directory
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
