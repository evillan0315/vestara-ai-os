import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
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

// Font sizes
const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', description: '14px base' },
  { value: 'medium', label: 'Medium', description: '16px base (default)' },
  { value: 'large', label: 'Large', description: '18px base' },
  { value: 'xlarge', label: 'XLarge', description: '20px base' },
];

// Border radius options
const BORDER_RADIUS_OPTIONS = [
  { value: 'small', label: 'Small', description: '4px' },
  { value: 'medium', label: 'Medium', description: '8px (default)' },
  { value: 'large', label: 'Large', description: '12px' },
  { value: 'xlarge', label: 'XLarge', description: '16px' },
];

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact', icon: '☷' },
  { value: 'comfortable', label: 'Comfortable', icon: '☐' },
  { value: 'spacious', label: 'Spacious', icon: '⊞' },
];

const SCROLLBAR_STYLE_OPTIONS = [
  { value: 'system', label: 'System Default' },
  { value: 'thin', label: 'Thin' },
  { value: 'visible', label: 'Always Visible' },
  { value: 'auto', label: 'Auto Hide' },
];

const PRESET_THEMES = {
  default: {
    name: 'Default',
    colors: {
      primary: '#C9A84C', // gold
      secondary: '#4F8CFF', // blue
      success: '#22C55E', // green
      warning: '#F59E0B', // amber
      error: '#EF4444', // red
    }
  },
  ocean: {
    name: 'Ocean',
    colors: {
      primary: '#0891B2', // cyan
      secondary: '#3B82F6', // blue
      success: '#10B981', // emerald
      warning: '#F59E0B', // amber
      error: '#EF4444', // red
    }
  },
  forest: {
    name: 'Forest',
    colors: {
      primary: '#10B981', // green
      secondary: '#059669', // emerald
      success: '#84CC16', // lime
      warning: '#F59E0B', // amber
      error: '#EF4444', // red
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      primary: '#6366F1', // indigo
      secondary: '#8B5CF6', // violet
      success: '#10B981', // emerald
      warning: '#F59E0B', // amber
      error: '#EF4444', // red
    }
  }
};

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

// Row descriptor for search indexing
interface SettingRowDef {
  label: string;
  section: string;
  tab: SettingsTab;
}

const ALL_SETTINGS_ROWS: SettingRowDef[] = [
  { label: 'Version', section: 'System', tab: 'general' },
  { label: 'User', section: 'System', tab: 'general' },
  { label: 'Auto-start Services', section: 'System', tab: 'general' },
  { label: 'Auto-refresh Interval', section: 'System', tab: 'general' },
  { label: 'Log Retention', section: 'System', tab: 'general' },
  { label: 'Database', section: 'Storage', tab: 'general' },
  { label: 'Data Location', section: 'Storage', tab: 'general' },
  { label: 'AI Providers', section: 'Providers', tab: 'providers' },
  { label: 'Default Provider', section: 'Defaults', tab: 'providers' },
  { label: 'Default Model', section: 'Defaults', tab: 'providers' },
  { label: 'Theme', section: 'Theme', tab: 'appearance' },
  { label: 'Font', section: 'Theme', tab: 'appearance' },
  { label: 'Font Size', section: 'Theme', tab: 'appearance' },
  { label: 'UI Density', section: 'Theme', tab: 'appearance' },
  { label: 'Border Radius', section: 'Theme', tab: 'appearance' },
  { label: 'Scrollbar Style', section: 'Theme', tab: 'appearance' },
  { label: 'Theme Preset', section: 'Theme', tab: 'appearance' },
  { label: 'Backup Settings', section: 'Data Management', tab: 'advanced' },
  { label: 'Keyboard Shortcuts', section: 'Keyboard Shortcuts', tab: 'advanced' },
  { label: 'Danger Zone', section: 'Danger Zone', tab: 'advanced' },
];

export function Settings() {
  const { settings, loading, dirty, error, clearError, updateSetting, bulkUpdate, resetSettings, backupSettings } = useSettings();
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme, font, setFont, fontSize, uiDensity, borderRadius, scrollbarStyle, setFontSize, setUIDensity, setBorderRadius, setScrollbarStyle, currentColors, setCurrentColors, isCustomizing, setIsCustomizing, applyCustomColors } = useTheme();
  const { addToast, toasts, removeToast, updateToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backupDone, setBackupDone] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const errorShownRef = useRef<string | null>(null);

  // Show error toasts when useSettings reports an error
  useEffect(() => {
    if (error && error !== errorShownRef.current) {
      errorShownRef.current = error;
      addToast(error, 'error');
      clearError();
    }
  }, [error, addToast, clearError]);

  // Determine which tabs have matching content for search highlighting
  const tabMatchCounts = useMemo(() => {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase();
    const counts: Record<SettingsTab, number> = { general: 0, providers: 0, appearance: 0, advanced: 0 };
    for (const row of ALL_SETTINGS_ROWS) {
      if (row.label.toLowerCase().includes(q) || row.section.toLowerCase().includes(q)) {
        counts[row.tab]++;
      }
    }
    return counts;
  }, [searchQuery]);

  // If a search is active and current tab has no matches, auto-switch to a tab that does
  useEffect(() => {
    if (!tabMatchCounts || !searchQuery) return;
    if (tabMatchCounts[activeTab] === 0) {
      const firstMatch = (Object.entries(tabMatchCounts) as [SettingsTab, number][]).find(([, c]) => c > 0);
      if (firstMatch) setActiveTab(firstMatch[0]);
    }
  }, [tabMatchCounts, activeTab, searchQuery]);

  const handleThemeChange = useCallback((value: string) => {
    setTheme(value as 'dark' | 'light' | 'system');
  }, [setTheme]);

  const handleFontChange = useCallback((value: string) => {
    setFont(value);
  }, [setFont]);

  const handleFontSizeChange = useCallback((value: string) => {
    setFontSize(value);
  }, [setFontSize]);

  const handleUIDensityChange = useCallback((value: string) => {
    setUIDensity(value);
  }, [setUIDensity]);

  const handleBorderRadiusChange = useCallback((value: string) => {
    setBorderRadius(value);
  }, [setBorderRadius]);

  const handleScrollbarStyleChange = useCallback((value: string) => {
    setScrollbarStyle(value);
  }, [setScrollbarStyle]);

  const handleBackup = useCallback(async () => {
    const path = await backupSettings();
    if (path) {
      setBackupDone(path);
      setBackupError(null);
      addToast('Settings backed up successfully');
    } else {
      setBackupError('Backup failed');
      setBackupDone(null);
      addToast('Backup failed', 'error');
    }
  }, [backupSettings, addToast]);

  const handleReset = useCallback(async () => {
    await resetSettings();
    setShowResetConfirm(false);
    addToast('Settings reset to defaults');
  }, [resetSettings, addToast]);

  // Derive values with defaults
  const refreshInterval = settings.refreshInterval || '3000';
  const logRetention = settings.logRetention || '2000';

  // Filter function — returns true if label/section matches search
  const matchesSearch = useCallback((label: string, section: string) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return label.toLowerCase().includes(q) || section.toLowerCase().includes(q);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="widget-enter">
          <h1 className="text-2xl font-bold text-vestara-text">Settings</h1>
          <p className="text-sm text-vestara-text-muted">Loading...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass p-5 animate-pulse">
              <div className="h-4 w-24 bg-white/10 rounded mb-3" />
              <div className="h-3 w-full bg-white/5 rounded" />
            </div>
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
      {TABS.map((tab) => {
        const matchCount = tabMatchCounts?.[tab.id];
        const showBadge = searchQuery && matchCount !== undefined;
        return (
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
            {showBadge && (
              <span className={`text-[10px] px-1 rounded ${
                matchCount > 0
                  ? 'bg-vestara-gold/20 text-vestara-gold'
                  : 'bg-white/5 text-vestara-text-dim'
              }`}>
                {matchCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 md:p-6">
      <div className="w-full flex-shrink-0">
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
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-64">{searchBar}</div>
        {tabBar}
      </div>

      {/* Tab: General */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SettingsCard title="System" icon="💻">
            {matchesSearch('Version', 'System') && (
              <SettingRow label="Version" value="0.1.0" description="Vestara AI OS" />
            )}
            {matchesSearch('User', 'System') && (
              <SettingRow label="User" value={user?.name || '—'} />
            )}
            {matchesSearch('Auto-start Services', 'System') && (
              <SettingRow
                label="Auto-start Services"
                value={settings.autoStart ?? 'true'}
                type="toggle"
                onChange={(v) => updateSetting('autoStart', v)}
                description="Start services on boot"
              />
            )}
            {matchesSearch('Auto-refresh Interval', 'System') && (
              <SettingRow
                label="Auto-refresh Interval"
                value={refreshInterval}
                type="select"
                options={REFRESH_OPTIONS}
                onChange={(v) => updateSetting('refreshInterval', v)}
                description="Dashboard real-time update rate"
              />
            )}
            {matchesSearch('Log Retention', 'System') && (
              <SettingRow
                label="Log Retention"
                value={logRetention}
                type="select"
                options={LOG_RETENTION_OPTIONS}
                onChange={(v) => updateSetting('logRetention', v)}
                description="Max in-memory log entries"
              />
            )}
          </SettingsCard>

          <SettingsCard title="Storage" icon="💾">
            {matchesSearch('Database', 'Storage') && (
              <SettingRow label="Database" value="SQLite" />
            )}
            {matchesSearch('Data Location', 'Storage') && (
              <SettingRow label="Data Location" value="~/vestara/data/" monospace />
            )}
          </SettingsCard>
        </div>
      )}

      {/* Tab: AI Providers */}
      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={matchesSearch('AI Providers', 'Providers') ? '' : 'hidden'}>
            <ProviderCard />
          </div>
          <SettingsCard title="Defaults" icon="⭐" defaultOpen={true}>
            {matchesSearch('Default Provider', 'Defaults') && (
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
            )}
            {matchesSearch('Default Model', 'Defaults') && (
              <SettingRow
                label="Default Model"
                value={settings.defaultModel || 'opencode/deepseek-v4-flash-free'}
                type="text"
                onChange={(v) => updateSetting('defaultModel', v)}
                description="Model ID for new conversations"
              />
            )}
          </SettingsCard>
        </div>
      )}

      {/* Tab: Appearance */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SettingsCard title="Theme" icon="🎨">
            {matchesSearch('Theme', 'Theme') && (
              <div className="space-y-3">
                <div className="p-4 bg-vestara-bg/50 rounded-lg border border-vestara-glass-border/50">
                  <p className="text-xs text-vestara-text-muted mb-3">Current Theme Colors</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="w-8 h-8 rounded bg-vestara-gold mb-1 border border-white/10" />
                      <span className="text-[9px] text-vestara-text-muted">Primary</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 rounded bg-vestara-blue mb-1 border border-white/10" />
                      <span className="text-[9px] text-vestara-text-muted">Secondary</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 rounded bg-vestara-success mb-1 border border-white/10" />
                      <span className="text-[9px] text-vestara-text-muted">Success</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 rounded bg-vestara-warning mb-1 border border-white/10" />
                      <span className="text-[9px] text-vestara-text-muted">Warning</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-vestara-text-muted">
                  Custom colors are applied globally. Use the preset themes or custom editor to modify them.
                </p>
                <p className="text-[10px] text-vestara-text-dim">Choose your preferred theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((opt) => {
                    const isActive = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleThemeChange(opt.value)}
                        className={`relative rounded-lg border p-3 text-left transition-all ${
                          isActive
                            ? 'border-vestara-gold bg-vestara-gold/10'
                            : 'border-vestara-glass-border hover:border-vestara-text-dim'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            isActive ? 'border-vestara-gold bg-vestara-gold' : 'border-vestara-text-dim'
                          }`}>
                            {isActive && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-vestara-bg" />
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium text-vestara-text">{opt.label}</span>
                        </div>
                        {/* Theme preview */}
                        <div className={`rounded-md p-2 text-[9px] ${
                          opt.value === 'dark' || (opt.value === 'system' && resolvedTheme === 'dark')
                            ? 'bg-[#06060C] text-[#E8ECF1]'
                            : opt.value === 'light' || (opt.value === 'system' && resolvedTheme === 'light')
                              ? 'bg-[#F8F9FC] text-[#1A1D29]'
                              : 'bg-[#06060C] text-[#E8ECF1]'
                        }`}>
                          <div className="flex gap-1 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-vestara-gold" />
                            <div className="w-1.5 h-1.5 rounded-full bg-vestara-success" />
                            <div className="w-1.5 h-1.5 rounded-full bg-vestara-error" />
                          </div>
                          <div className="h-1 w-3/4 rounded bg-current opacity-20 mb-0.5" />
                          <div className="h-1 w-1/2 rounded bg-current opacity-20" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {matchesSearch('Font', 'Theme') && (
              <SettingRow
                label="Font"
                value={font}
                type="select"
                options={FONTS}
                onChange={handleFontChange}
                description="UI font family"
              />
            )}
            {matchesSearch('Font Size', 'Theme') && (
              <SettingRow
                label="Font Size"
                value={settings.fontSize || 'medium'}
                type="select"
                options={FONT_SIZE_OPTIONS}
                onChange={(v) => updateSetting('fontSize', v)}
                description="Base font size for UI elements"
              />
            )}
            {matchesSearch('UI Density', 'Theme') && (
              <SettingRow
                label="UI Density"
                value={settings.uiDensity || 'comfortable'}
                type="select"
                options={DENSITY_OPTIONS}
                onChange={(v) => updateSetting('uiDensity', v)}
                description="Overall spacing and sizing of components"
              />
            )}
            {matchesSearch('Border Radius', 'Theme') && (
              <SettingRow
                label="Border Radius"
                value={settings.borderRadius || 'medium'}
                type="select"
                options={BORDER_RADIUS_OPTIONS}
                onChange={(v) => updateSetting('borderRadius', v)}
                description="Rounded corners for UI elements"
              />
            )}
            {matchesSearch('Scrollbar Style', 'Theme') && (
              <SettingRow
                label="Scrollbar Style"
                value={settings.scrollbarStyle || 'system'}
                type="select"
                options={SCROLLBAR_STYLE_OPTIONS}
                onChange={(v) => updateSetting('scrollbarStyle', v)}
                description="How scrollbars appear and behave"
              />
            )}
            {matchesSearch('Theme Preset', 'Theme') && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-vestara-text-dim">Quick apply preset themes</p>
                  <button
                    onClick={() => {
                      // Enable custom theme editor
                      setActiveTab('appearance');
                      // Scroll to theme editor section
                      setTimeout(() => {
                        const element = document.querySelector('[data-theme-editor]');
                        if (element) element.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="text-[10px] text-vestara-gold hover:text-vestara-gold-light transition-colors"
                  >
                    Edit Custom Theme →
                  </button>
                </div>
                <div className="p-4 bg-vestara-bg/50 rounded-lg border border-vestara-glass-border/50">
                  <p className="text-xs text-vestara-text-muted mb-3">Accessibility Settings</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        // Increase contrast mode
                        const root = document.documentElement;
                        const currentBg = getComputedStyle(root).getPropertyValue('--color-vestara-bg');
                        const currentText = getComputedStyle(root).getPropertyValue('--color-vestara-text');
                        
                        // Toggle high contrast mode
                        if (!root.classList.contains('high-contrast')) {
                          root.classList.add('high-contrast');
                          addToast('High contrast mode enabled', 'info');
                        } else {
                          root.classList.remove('high-contrast');
                          addToast('High contrast mode disabled', 'info');
                        }
                      }}
                      className="w-full text-left p-3 rounded-lg bg-vestara-surface/50 hover:bg-vestara-surface transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-vestara-text">High Contrast Mode</p>
                          <p className="text-[10px] text-vestara-text-dim">Increase color contrast for better visibility</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-vestara-glass relative">
                          <div className="absolute inset-y-0 left-1 w-3 h-3 rounded-full bg-vestara-text-dim" />
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        // Reduce animations
                        const root = document.documentElement;
                        if (!root.classList.contains('reduced-animations')) {
                          root.classList.add('reduced-animations');
                          addToast('Reduced animations mode enabled', 'info');
                        } else {
                          root.classList.remove('reduced-animations');
                          addToast('Reduced animations mode disabled', 'info');
                        }
                      }}
                      className="w-full text-left p-3 rounded-lg bg-vestara-surface/50 hover:bg-vestara-surface transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-vestara-text">Reduced Animations</p>
                          <p className="text-[10px] text-vestara-text-dim">Minimize CSS animations for motion sensitivity</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-vestara-glass relative">
                          <div className="absolute inset-y-0 left-1 w-3 h-3 rounded-full bg-vestara-text-dim" />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PRESET_THEMES).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => {
                        // Apply preset colors as CSS variables
                        const root = document.documentElement;
                        Object.entries(preset.colors).forEach(([colorName, colorValue]) => {
                          const cssVar = colorName === 'primary' ? '--color-vestara-gold' :
                                       colorName === 'secondary' ? '--color-vestara-blue' :
                                       colorName === 'success' ? '--color-vestara-success' :
                                       colorName === 'warning' ? '--color-vestara-warning' :
                                       colorName === 'error' ? '--color-vestara-error' : `--color-${colorName}`;
                          root.style.setProperty(cssVar, colorValue);
                        });
                        addToast(`${preset.name} preset applied`);
                      }}
                      className="p-3 rounded-lg border border-vestara-glass-border bg-vestara-surface hover:bg-vestara-gold/10 transition-colors text-left"
                    >
                      <div className="text-xs font-medium text-vestara-text mb-2">{preset.name}</div>
                      <div className="flex gap-1">
                        {Object.values(preset.colors).slice(0, 3).map((color, i) => (
                          <div key={i} className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-vestara-surface/50 rounded-lg border border-vestara-glass-border/50" data-theme-editor>
                  <p className="text-[9px] text-vestara-text-muted mb-2">Custom Color Editor</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-vestara-gold border border-white/10" />
                      <input
                        type="color"
                        value={currentColors.primary}
                        onChange={(e) => {
                          const newColors = { ...currentColors, primary: e.target.value };
                          setCurrentColors(newColors);
                          document.documentElement.style.setProperty('--color-vestara-gold', e.target.value);
                        }}
                        className="w-16 h-6 rounded border border-vestara-glass-border bg-transparent cursor-pointer"
                      />
                      <span className="text-[9px] text-vestara-text-muted">Primary</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-vestara-blue border border-white/10" />
                      <input
                        type="color"
                        value={currentColors.secondary}
                        onChange={(e) => {
                          const newColors = { ...currentColors, secondary: e.target.value };
                          setCurrentColors(newColors);
                          document.documentElement.style.setProperty('--color-vestara-blue', e.target.value);
                        }}
                        className="w-16 h-6 rounded border border-vestara-glass-border bg-transparent cursor-pointer"
                      />
                      <span className="text-[9px] text-vestara-text-muted">Secondary</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-vestara-success border border-white/10" />
                      <input
                        type="color"
                        value={currentColors.success}
                        onChange={(e) => {
                          const newColors = { ...currentColors, success: e.target.value };
                          setCurrentColors(newColors);
                          document.documentElement.style.setProperty('--color-vestara-success', e.target.value);
                        }}
                        className="w-16 h-6 rounded border border-vestara-glass-border bg-transparent cursor-pointer"
                      />
                      <span className="text-[9px] text-vestara-text-muted">Success</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SettingsCard>
        </div>
      )}

      {/* Tab: Advanced */}
      {activeTab === 'advanced' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SettingsCard title="Data Management" icon="💾">
            {matchesSearch('Backup Settings', 'Data Management') && (
              <>
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
              </>
            )}
          </SettingsCard>

          <SettingsCard title="Keyboard Shortcuts" icon="⌨️" defaultOpen={false}>
            {matchesSearch('Keyboard Shortcuts', 'Keyboard Shortcuts') && (
              <div className="space-y-1 text-xs text-vestara-text-dim">
                <div className="flex justify-between py-1"><kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+K</kbd><span>Command palette</span></div>
                <div className="flex justify-between py-1"><kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+N</kbd><span>New chat</span></div>
                <div className="flex justify-between py-1"><kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Ctrl+Shift+,</kbd><span>Settings</span></div>
                <div className="flex justify-between py-1"><kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">Escape</kbd><span>Close modal</span></div>
              </div>
            )}
          </SettingsCard>

          {/* Danger Zone */}
          <SettingsCard title="Danger Zone" icon="⚠️" defaultOpen={false} className="border border-red-500/20">
            {matchesSearch('Danger Zone', 'Danger Zone') && (
              <div className="space-y-3 pt-2">
                <p className="text-[10px] text-vestara-text-dim">Destructive actions that cannot be undone.</p>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Reset All Settings to Defaults
                </button>
              </div>
            )}
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
