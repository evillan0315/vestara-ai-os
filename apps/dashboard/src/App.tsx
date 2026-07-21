import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Chat } from './pages/Chat';
import { Agents } from './pages/Agents';
import { Models } from './pages/Models';
import { OpenCodePage } from './pages/OpenCode';
import { Settings } from './pages/Settings';
import Memory from './pages/Memory';
import Knowledge from './pages/Knowledge';
import Terminal from './pages/Terminal';
import SystemMonitor from './pages/SystemMonitor';
import Users from './pages/Users';
import Scripts from './pages/Scripts';
import FileManager from './pages/FileManager';
import Projects from './pages/Projects';
import Logs from './pages/Logs';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vestara-bg">
        <div className="text-sm text-vestara-text-muted">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-vestara-bg">
        <div className="text-sm text-vestara-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/opencode" element={<OpenCodePage />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/models" element={<Models />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/terminal" element={<Terminal />} />
        <Route path="/monitor" element={<SystemMonitor />} />
        <Route path="/users" element={<Users />} />
        <Route path="/scripts" element={<Scripts />} />
        <Route path="/files" element={<FileManager />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
