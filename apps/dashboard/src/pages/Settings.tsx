export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vestara-text">Settings</h1>
        <p className="text-sm text-vestara-text-muted">System configuration.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Appearance</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-vestara-text-muted">Theme</span>
              <span className="text-vestara-text">Dark</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-vestara-text-muted">Font</span>
              <span className="text-vestara-text">Plus Jakarta Sans</span>
            </div>
          </div>
        </div>

        <div className="glass p-5">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">AI Providers</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-vestara-text-muted">Default Provider</span>
              <span className="text-vestara-text">OpenAI</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-vestara-text-muted">Default Model</span>
              <span className="text-vestara-text">GPT-4o</span>
            </div>
          </div>
        </div>

        <div className="glass p-5">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">System</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-vestara-text-muted">Version</span>
              <span className="text-vestara-text">0.1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-vestara-text-muted">Auto-start Services</span>
              <span className="text-vestara-success">Enabled</span>
            </div>
          </div>
        </div>

        <div className="glass p-5">
          <h2 className="mb-3 text-sm font-semibold text-vestara-gold">Storage</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-vestara-text-muted">Database</span>
              <span className="text-vestara-text">SQLite</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-vestara-text-muted">Data Location</span>
              <span className="text-vestara-text font-mono text-xs">~/vestara/data/</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
