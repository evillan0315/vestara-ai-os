import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

interface SystemUser {
  username: string;
  uid: number;
  homeDir: string;
  shell: string;
}

export default function Users() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    loadUsers();
    loadSystemUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch {} finally { setLoading(false); }
  };

  const loadSystemUsers = async () => {
    try {
      const res = await fetch('/api/users/system', { headers });
      if (res.ok) {
        const data = await res.json();
        setSystemUsers(data.systemUsers);
      }
    } catch {}
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: 'user' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        const body: Record<string, string> = { name: form.name, email: form.email, role: form.role };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT', headers, body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error);
          return;
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST', headers,
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error);
          return;
        }
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers });
    if (res.ok) loadUsers();
  };

  const handleSyncOs = async (username: string) => {
    const res = await fetch('/api/users/sync-os', {
      method: 'POST', headers,
      body: JSON.stringify({ username }),
    });
    if (res.ok) loadUsers();
  };

  const isInDb = (username: string) => users.some((u) => u.email === `${username}@os.local`);

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-vestara-gold bg-vestara-gold/10';
      case 'editor': return 'text-vestara-blue bg-vestara-blue/10';
      default: return 'text-vestara-text-muted bg-white/5';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-vestara-blue text-lg">Loading users...</div>
      </div>
    );
  }

if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-vestara-blue text-lg">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 md:p-6">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-vestara-text">Users</h1>
            <p className="text-sm text-vestara-text-muted">Manage dashboard users and OS accounts</p>
          </div>
          <button onClick={openCreate} className="btn-gold px-4 py-2 text-sm">+ Add User</button>
        </div>
        <button onClick={openCreate} className="btn-gold px-4 py-2 text-sm">+ Add User</button>
      </div>

      {/* OS Users */}
      {systemUsers.length > 0 && (
        <div className="glass mb-6 p-4">
          <h2 className="text-sm font-semibold text-vestara-text mb-3">System Users</h2>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {systemUsers.map((su) => (
              <div key={su.username} className="flex items-center justify-between rounded-lg border border-vestara-glass-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-vestara-gold/20 text-[10px] font-bold text-vestara-gold">
                    {su.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-vestara-text">{su.username}</p>
                    <p className="text-[10px] text-vestara-text-dim">uid:{su.uid}</p>
                  </div>
                </div>
                {isInDb(su.username) ? (
                  <span className="text-[10px] text-vestara-success">synced</span>
                ) : (
                  <button onClick={() => handleSyncOs(su.username)} className="text-[10px] text-vestara-gold hover:underline">import</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Users Table */}
      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-vestara-glass-border text-left text-xs text-vestara-text-muted">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-vestara-text-dim">Loading...</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-vestara-text-dim">No users</td></tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="border-b border-vestara-glass-border hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-vestara-gold/20 text-xs font-bold text-vestara-gold">
                      {user.name[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-vestara-text">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-vestara-text-muted">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${roleColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-vestara-text-dim">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(user)} className="text-vestara-text-muted hover:text-vestara-text text-xs mr-3">edit</button>
                  <button onClick={() => handleDelete(user.id)} className="text-vestara-text-muted hover:text-red-400 text-xs">delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-vestara-text mb-4">
              {editingUser ? 'Edit User' : 'Create User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-vestara-text-muted">Name</label>
                <input
                  type="text" value={form.name} required
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2.5 text-sm text-vestara-text outline-none focus:border-vestara-gold/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-vestara-text-muted">Email</label>
                <input
                  type="email" value={form.email} required
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2.5 text-sm text-vestara-text outline-none focus:border-vestara-gold/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-vestara-text-muted">
                  {editingUser ? 'New Password (leave blank to keep)' : 'Password'}
                </label>
                <input
                  type="password" value={form.password}
                  required={!editingUser}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2.5 text-sm text-vestara-text outline-none focus:border-vestara-gold/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-vestara-text-muted">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-2.5 text-sm text-vestara-text outline-none"
                >
                  <option value="user">User</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-lg border border-vestara-glass-border px-4 py-2 text-sm text-vestara-text-muted hover:text-vestara-text">
                  Cancel
                </button>
                <button type="submit" className="btn-gold px-4 py-2 text-sm">
                  {editingUser ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
