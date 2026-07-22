import { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastContainer } from './ToastContainer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

/* ── Page metadata ── */

interface Breadcrumb {
  label: string;
  href?: string;
}

interface SubNav {
  label: string;
  href: string;
}

interface PageMeta {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  subNav?: SubNav[];
  fullWidth?: boolean;
}

const PAGE_META: Record<string, PageMeta> = {
  '/dashboard': { title: 'Dashboard', fullWidth: true },
  '/chat': { title: 'AI Chat', fullWidth: true },
  '/opencode': { title: 'OpenCode', fullWidth: true },
  '/agents': { title: 'Agent Manager', fullWidth: true },
  '/models': { title: 'Models', fullWidth: true },
  '/memory': {
    title: 'Memory',
    description: 'Search and manage memories across all categories',
    breadcrumbs: [{ label: 'Data' }, { label: 'Memory' }],
    fullWidth: true,
  },
  '/projects': {
    title: 'Projects',
    description: 'Manage projects and tasks',
    breadcrumbs: [{ label: 'Data' }, { label: 'Projects' }],
    fullWidth: true,
  },
  '/knowledge': {
    title: 'Knowledge',
    description: 'Search and manage knowledge base entries',
    breadcrumbs: [{ label: 'Data' }, { label: 'Knowledge' }],
    fullWidth: true,
  },
  '/terminal': { title: 'Terminal', fullWidth: true },
  '/monitor': {
    title: 'System Monitor',
    description: 'Real-time CPU, memory, disk, and network metrics',
    breadcrumbs: [{ label: 'System' }, { label: 'Monitor' }],
    subNav: [
      { label: 'Dashboard', href: '/monitor' },
      { label: 'Logs', href: '/logs' },
    ],
    fullWidth: true,
  },
  '/files': { title: 'File Manager', fullWidth: true },
  '/users': { title: 'Users', fullWidth: true },
  '/scripts': { title: 'Scripts', fullWidth: true },
  '/logs': {
    title: 'Logs',
    description: 'View application and system logs with live updates',
    breadcrumbs: [{ label: 'System' }, { label: 'Logs' }],
    subNav: [
      { label: 'Monitor', href: '/monitor' },
      { label: 'Logs', href: '/logs' },
    ],
    fullWidth: true,
  },
  '/settings': { title: 'Settings', fullWidth: true },
};

/* ── Context ── */

interface DashboardLayoutContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function useDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) throw new Error('useDashboardLayout must be used within DashboardLayout');
  return ctx;
}

/* ── Breadcrumbs ── */

function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-vestara-text-dim">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-vestara-text-dim/40">/</span>}
          {item.href ? (
            <Link to={item.href} className="hover:text-vestara-text transition-colors">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ── Sub-navigation ── */

function SubNav({ items, currentPath }: { items: SubNav[]; currentPath: string }) {
  return (
    <div className="flex items-center gap-1">
      {items.map((item) => {
        const isActive = currentPath === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-vestara-gold/15 text-vestara-gold'
                : 'text-vestara-text-muted hover:bg-white/5 hover:text-vestara-text'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ── Main Layout ── */

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const meta = useMemo(() => PAGE_META[location.pathname] || { title: 'Vestara AI OS' }, [location.pathname]);

  // Set page title
  useEffect(() => {
    document.title = `${meta.title} · Vestara AI OS`;
  }, [meta.title]);

  const contextValue = useMemo(() => ({ sidebarOpen, setSidebarOpen }), [sidebarOpen]);

return (
    <DashboardLayoutContext.Provider value={contextValue}>
      <div className="flex h-screen bg-vestara-bg" data-theme={resolvedTheme}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <div className="flex items-center gap-3 border-b border-vestara-glass-border px-4 py-3 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-vestara-text-muted hover:text-vestara-text"
              aria-label="Open sidebar"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Vestara" className="h-6 w-6" />
              <span className="text-sm font-semibold text-vestara-text">Vestara AI OS</span>
            </div>
          </div>

          {/* Page header */}
          {!meta.fullWidth && (meta.title || meta.subNav) && (
            <div className="border-b border-vestara-glass-border px-4 py-3 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  {meta.breadcrumbs && <Breadcrumbs items={meta.breadcrumbs} />}
                  <h1 className="text-lg font-semibold text-vestara-text">{meta.title}</h1>
                  {meta.description && (
                    <p className="mt-0.5 text-xs text-vestara-text-dim">{meta.description}</p>
                  )}
                </div>
                {meta.subNav && <SubNav items={meta.subNav} currentPath={location.pathname} />}
              </div>
            </div>
          )}

          {/* Main content */}
          <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <ErrorBoundary key={location.pathname}>
              <div className="flex-1 flex flex-col overflow-hidden widget-enter">
                <Outlet />
              </div>
            </ErrorBoundary>
          </main>

          <StatusBar />
        </div>

        {/* Global toast container */}
        <ToastContainer />
      </div>
    </DashboardLayoutContext.Provider>
  );
}
