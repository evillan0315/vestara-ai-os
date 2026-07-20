import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'AI',
    items: [
      { to: '/chat', label: 'AI Chat', icon: '💬' },
      { to: '/opencode', label: 'OpenCode', icon: '⚡' },
      { to: '/agents', label: 'Agents', icon: '🤖' },
      { to: '/models', label: 'Models', icon: '🧠' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/memory', label: 'Memory', icon: '💾' },
      { to: '/projects', label: 'Projects', icon: '📋' },
      { to: '/knowledge', label: 'Knowledge', icon: '📚' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/terminal', label: 'Terminal', icon: '💻' },
      { to: '/files', label: 'Files', icon: '📁' },
      { to: '/monitor', label: 'Monitor', icon: '📈' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/scripts', label: 'Scripts', icon: '📜' },
      { to: '/users', label: 'Users', icon: '👥' },
      { to: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && onClose && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-vestara-glass-border bg-vestara-surface/50
          transition-transform duration-200
          md:static md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-vestara-glass-border px-5 py-4">
          <img src="/logo.svg" alt="Vestara" className="h-8 w-8" />
          <span className="text-sm font-semibold text-vestara-text">Vestara AI OS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-vestara-text-dim">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-vestara-gold/10 text-vestara-gold'
                          : 'text-vestara-text-muted hover:bg-white/5 hover:text-vestara-text'
                      }`
                    }
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-vestara-glass-border p-3">
          {user && (
            <div className="mb-2 flex items-center gap-2 px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-vestara-gold/20 text-[10px] font-bold text-vestara-gold">
                {user.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-vestara-text">{user.name}</p>
                <p className="truncate text-[10px] text-vestara-text-dim">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-vestara-text-muted hover:bg-white/5 hover:text-red-400"
          >
            <span className="text-base">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
