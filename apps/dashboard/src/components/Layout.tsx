import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { ErrorBoundary } from './ErrorBoundary';
import { ToastContainer } from './ToastContainer';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat': 'AI Chat',
  '/opencode': 'OpenCode',
  '/agents': 'Agent Manager',
  '/models': 'Models',
  '/memory': 'Memory',
  '/projects': 'Projects',
  '/knowledge': 'Knowledge',
  '/terminal': 'Terminal',
  '/monitor': 'System Monitor',
  '/files': 'File Manager',
  '/users': 'Users',
  '/scripts': 'Scripts',
  '/logs': 'Logs',
  '/settings': 'Settings',
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  // Set page title
  useEffect(() => {
    const page = PAGE_TITLES[location.pathname] || 'Vestara AI OS';
    document.title = `${page} · Vestara AI OS`;
  }, [location.pathname]);

  return (
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

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <ErrorBoundary key={location.pathname}>
            <div className="widget-enter">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>

        <StatusBar />
      </div>

      {/* Global toast container */}
      <ToastContainer />
    </div>
  );
}
