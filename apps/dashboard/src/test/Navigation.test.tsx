import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthContext } from '../contexts/AuthContext';
import { AppRoutes } from '../App';
import { mockAuthValue } from './mocks';
import type { ReactNode } from 'react';

/* ── Helpers ── */

function renderWithAuth(ui: ReactNode, { initialEntries = ['/'] } = {}) {
  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
}

function renderUnauthenticated(initialEntries = ['/dashboard']) {
  const noAuth = { ...mockAuthValue, user: null, token: null };
  return render(
    <AuthContext.Provider value={noAuth}>
      <MemoryRouter initialEntries={initialEntries}>
        <AppRoutes />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

/** Get the currently active (aria-current="page") sidebar link. */
function getActiveLink() {
  return screen.getByRole('link', { current: 'page' });
}

/** Get all sidebar nav links (excludes Sign Out, logo link, etc.). */
function getSidebarLinks() {
  const nav = screen.getByRole('navigation');
  return within(nav).getAllByRole('link');
}

const ALL_SIDEBAR_LINKS = [
  'Dashboard',
  'AI Chat',
  'OpenCode',
  'Agents',
  'Models',
  'Memory',
  'Projects',
  'Knowledge',
  'Terminal',
  'Files',
  'Monitor',
  'Logs',
  'Scripts',
  'Users',
  'Settings',
];

/* ── Tests ── */

describe('Navigation — authenticated user', () => {
  beforeEach(() => {
    vi.mocked(mockAuthValue.logout).mockClear();
  });

  it('renders the sidebar', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('redirects / to /dashboard', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/'] });
    const active = getActiveLink();
    expect(active).toHaveAttribute('href', '/dashboard');
  });

  it('renders all sidebar group headings', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
    const nav = screen.getByRole('navigation');
    for (const heading of ['AI', 'Data', 'System', 'Admin']) {
      // Each heading appears once in the nav (some also appear in page content)
      expect(within(nav).getByText(heading)).toBeInTheDocument();
    }
  });

  it('renders all 15 sidebar links', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
    const nav = screen.getByRole('navigation');
    const links = getSidebarLinks();
    expect(links.length).toBe(ALL_SIDEBAR_LINKS.length);
    for (const label of ALL_SIDEBAR_LINKS) {
      expect(within(nav).getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('navigates to each sidebar page on link click', async () => {
    const routes: { label: string; expected: string }[] = [
      { label: 'Dashboard', expected: '/dashboard' },
      { label: 'AI Chat', expected: '/chat' },
      { label: 'OpenCode', expected: '/opencode' },
      { label: 'Agents', expected: '/agents' },
      { label: 'Models', expected: '/models' },
      { label: 'Memory', expected: '/memory' },
      { label: 'Projects', expected: '/projects' },
      { label: 'Knowledge', expected: '/knowledge' },
      { label: 'Terminal', expected: '/terminal' },
      { label: 'Files', expected: '/files' },
      { label: 'Monitor', expected: '/monitor' },
      { label: 'Logs', expected: '/logs' },
      { label: 'Scripts', expected: '/scripts' },
      { label: 'Users', expected: '/users' },
      { label: 'Settings', expected: '/settings' },
    ];

    for (const { label, expected } of routes) {
      const { unmount } = renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
      const user = userEvent.setup();
      // Find the link within the navigation element
      const nav = screen.getByRole('navigation');
      const link = within(nav).getByRole('link', { name: new RegExp(label, 'i') });
      await user.click(link);
      // After click, the active link should point to the expected path
      const active = getActiveLink();
      expect(active).toHaveAttribute('href', expected);
      unmount();
    }
  });

  it('shows the user name and role in the sidebar', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('renders the Sign Out button and calls logout on click', async () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
    const signOut = screen.getByRole('button', { name: /sign out/i });
    expect(signOut).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(signOut);
    expect(mockAuthValue.logout).toHaveBeenCalledOnce();
  });

  it('renders the StatusBar with hardware stats', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
    // StatusBar shows CPU, RAM, Disk with fallback "--" when API unavailable
    expect(screen.getByText(/cpu.*--.*%/i)).toBeInTheDocument();
    expect(screen.getByText(/ram.*--/i)).toBeInTheDocument();
    expect(screen.getByText(/disk.*--/i)).toBeInTheDocument();
  });
});

describe('Navigation — unauthenticated user', () => {
  it('redirects /dashboard to /login', () => {
    renderUnauthenticated(['/dashboard']);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects every protected route to /login', () => {
    const protectedRoutes = [
      '/chat', '/opencode', '/agents', '/models',
      '/memory', '/projects', '/knowledge',
      '/terminal', '/files', '/monitor', '/logs',
      '/scripts', '/users', '/settings',
    ];
    for (const path of protectedRoutes) {
      const { unmount } = renderUnauthenticated([path]);
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      unmount();
    }
  });

  it('shows login page on /login', () => {
    renderUnauthenticated(['/login']);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects /login to /dashboard when already authenticated', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/login'] });
    const active = getActiveLink();
    expect(active).toHaveAttribute('href', '/dashboard');
  });
});

describe('Active link styling', () => {
  it('marks Dashboard link active on /dashboard', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
    const active = getActiveLink();
    expect(active).toHaveAttribute('href', '/dashboard');
    expect(active.className).toContain('bg-vestara-gold');
  });

  it('shows Chat link without active styling when on /dashboard', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/dashboard'] });
    const nav = screen.getByRole('navigation');
    const chatLink = within(nav).getByRole('link', { name: /ai chat/i });
    expect(chatLink.className).not.toContain('bg-vestara-gold');
  });

  it('marks Agents link active on /agents', () => {
    renderWithAuth(<AppRoutes />, { initialEntries: ['/agents'] });
    const active = getActiveLink();
    expect(active).toHaveAttribute('href', '/agents');
    expect(active.className).toContain('bg-vestara-gold');
  });
});
