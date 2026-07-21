import { useState, useMemo, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { SettingsCard } from '../components/settings/SettingsCard';
import { SettingRow } from '../components/settings/SettingRow';
import { ProviderCard } from '../components/settings/ProviderCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

type SettingsTab = 'general' | 'providers' | 'appearance' | 'advanced';
const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'providers', label: 'AI Providers', icon: '🤖' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'advanced', label: 'Advanced', icon: '🔧' },
];

const FONTS = [
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Inter', label: 'Inter' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
  { value: 'system-ui', label: 'System UI' },
];

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const REFRESH_OPTIONS = [
  { value: '1000', label: '1s' },
  { value: '3000', label: '3s' },
  { value: '5000', label: '5s' },
  { value: '10000', label: '10s' },
  { value: '0', label: 'Off' },
];

const LOG_RETENTION_OPTIONS = [
  { value: '500', label: '500 entries' },
  { value: '1000', label: '1,000 entries' },
  { value: '2000', label: '2,000 entries' },
  { value: '5000', label: '5,000 entries' },
];

export function Settings() {
  const { settings, loading, dirty, updateSetting, bulkUpdate, resetSettings, backupSettings } = useSettings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backupDone, setBackupDone] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const handleThemeChange = useCallback((value: string) => {
    updateSetting('theme', value);
    // Apply theme class to <html> immediately
    if (value === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
    localStorage.setItem('vestara_theme', value);
  }, [updateSetting]);

  const handleFontChange = useCallback((value: string) => {
    updateSetting('font', value);
    document.documentElement.style.setProperty('--font-family', value);
  }, [updateSetting]);

  const handleBackup = useCallback(async () => {
    const path = await backupSettings();
    if (path) {
      setBackupDone(path);
      setBackupError(null);
    } else {
      setBackupError('Backup failed');
      setBackupDone(null);
    }
  }, [backupSettings]);

  const handleReset = useCallback(async () => {
    await resetSettings();
    setShowResetConfirm(false);
  }, [resetSettings]);

  // Derive values with defaults
  const theme = settings.theme || 'dark';
  const font = settings.font || 'Plus Jakarta Sans';
  const refreshInterval = settings.refreshInterval || '3000';
  const logRetention = settings.logRetention || '2000';

  // Search filter — match setting labels against query
  const filterBySearch = useCallback((label: string) => {
    if (!searchQuery) return true;
    return label.toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-vestara-text">Settings</h1><p className="text-sm text-vestara-text-muted">Loading...</p></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass p-5 animate-pulse"><div className="h-4 w-24 bg-white/10 rounded mb-3" /><div className="h-3 w-full bg-white/5 rounded" /></div>
          ))}
        </div>
      </div>
    );
  }

  const searchBar = (
    <div className="relative">
      <input
        type="text"
        placeholder="Search settings..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded-lg border border-vestara-glass-border bg-vestara-bg px-3 py-1.5 pl-8 text-xs text-vestara-text outline-none placeholder:text-vestara-text-dim"
      />
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vestara-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );

  const tabBar = (
    <div className="flex rounded-lg border border-vestara-glass-border overflow-hidden">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-vestara-gold/10 text-vestara-gold'
              : 'text-vestara-text-muted hover:text-vestara-text hover:bg-white/5'
          }`}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-vestara-text">Settings</h1>
          <p className="text-sm text-vestara-text-muted">System configuration</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-[10px] text-yellow-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              Unsaved changes
            </span>
          )}
          {backupDone && (
            <span className="text-[10px] text-vestara-success">Backup saved</span>
          )}
          {backupError && (
            <span className="text-[10px] text-vestara-error">{backupError}</span>
          )}
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center gap-3">
        <div className="w-64">{searchBar}</div>
        {tabBar}
      </div>

      {/* Tab: General */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SettingsCard title="System" icon="💻">
            <SettingRow label="Version" value="0.1.0" description="Vestara AI OS" />
            <SettingRow label="User" value={user?.name || '—'} />
            <SettingRow
              label="Auto-start Services"
              value={settings.autoStart ?? 'true'}
              type="toggle"
              onChange={(v) => updateSetting('autoStart', v)}
              description="Start services on boot"
            />
            <SettingRow
              label="Auto-refresh Interval"
              value={refreshInterval}
              type="select"
              options={REFRESH_OPTIONS}
              onChange={(v) => updateSetting('refreshInterval', v)}
              description="Dashboard real-time update rate"
            />
            <SettingRow
              label="Log Retention"
              value={logRetention}
              type="select"
              options={LOG_RETENTION_OPTIONS}
              onChange={(v) => updateSetting('logRetention', v)}
              description="Max in-memory log entries"
            />
          </SettingsCard>

          <SettingsCard title="Storage" icon="💾">
            <SettingRow label="Database" value="SQLite" />
            <SettingRow label="Data Location" value="~/vestara/data/" monospace />
          </SettingsCard>
        </div>
      )}

      {/* Tab: AI Providers */}
      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProviderCard />
          <SettingsCard title="Defaults" icon="⭐" defaultOpen={true}>
            <SettingRow
              label="Default Provider"
              value={settings.defaultProvider || 'opencode'}
              type="select"
              options={[
                { value: 'opencode', label: 'OpenCode' },
                { value: 'openai', label: 'OpenAI' },
                { value: 'anthropic', label: 'Anthropic' },
                { value: 'google', label: 'Google' },
                { value: 'ollama', label: 'Ollama' },
              ]}
              onChange={(v) => updateSetting('defaultProvider', v)}
            />
            <SettingRow
              label="Default Model"
              value={settings.defaultModel || 'opencode/deepseek-v4-flash-free'}
              type="text"
              onChange={(v) => updateSetting('defaultModel', v)}
              description="Model ID for new conversations"
            />
          </SettingsCard>
        </div>
      )}

      {/* Tab: Appearance */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SettingsCard title="Theme" icon="🎨">
            <SettingRow
              label="Theme"
              value={theme}
              type="select"
              options={THEME_OPTIONS}
              onChange={handleThemeChange}
            />
            <SettingRow
              label="Font"
              value={font}
              type="select"
              options={FONTS}
              onChange={handleFontChange}
              description="UI font family"
            />
          </SettingsCard>
        </div>
      )}

      {/* Tab: Advanced */}
      {activeTab === 'advanced' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SettingsCard title="Data Management" icon="💾">
            <SettingRow
              label="Backup Settings"
              value={backupDone ? 'Done' : 'Ready'}
              type="text"
              description="Export all settings to a JSON file"
            />
            <button
              onClick={handleBackup}
              className="w-full rounded-lg border border-vestara-glass-border px-3 py-1.5 text-xs text-vestara-text-muted hover:text-vestara-text hover:bg-white/5 transition-colors mt-1"
            >
              Create Backup
            </button>
          </SettingsCard>

          <SettingsCard title="Keyboard Shortcuts" icon="⌨️" defaultOpen={false}>
            <div className="space-y-1 text-xs text-vestara-text-dim">
              <div className="flex justify-between py-1"><kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+K</kbd><span>Command palette</span></div>
              <div className="flex justify-between py-1"><kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+N</kbd><span>New chat</span></div>
              <div className="flex justify-between py-1"><kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+Shift+,</kbd><span>Settings</span></div>
              <div className="flex justify-between py-1"><kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Escape</kbd><span>Close modal</span></div>
            </div>
          </SettingsCard>

          {/* Danger Zone */}
          <SettingsCard title="Danger Zone" icon="⚠️" defaultOpen={false} className="border border-red-500/20">
            <div className="space-y-3 pt-2">
              <p className="text-[10px] text-vestara-text-dim">Destructive actions that cannot be undone.</p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Reset All Settings to Defaults
              </button>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* Reset confirmation */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset All Settings"
        message="This will reset all settings to their default values. This action cannot be undone."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
