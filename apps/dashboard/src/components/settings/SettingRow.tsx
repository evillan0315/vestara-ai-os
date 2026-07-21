import { useState } from 'react';

interface SettingRowProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: 'text' | 'select' | 'toggle' | 'password' | 'display';
  options?: { value: string; label: string }[];
  description?: string;
  monospace?: boolean;
}

export function SettingRow({ label, value, onChange, type = 'display', options, description, monospace }: SettingRowProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (newValue: string) => {
    onChange?.(newValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const renderInput = () => {
    switch (type) {
      case 'toggle':
        return (
          <button
            onClick={() => handleChange(value === 'true' ? 'false' : 'true')}
            className={`relative h-5 w-9 rounded-full transition-colors ${value === 'true' ? 'bg-vestara-success' : 'bg-white/10'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${value === 'true' ? 'translate-x-4' : ''}`} />
          </button>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="rounded-lg border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text outline-none max-w-[180px]"
          >
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'password':
        return (
          <div className="flex items-center gap-1">
            <input
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className="rounded-lg border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text outline-none w-40 font-mono"
              placeholder="••••••••"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-[10px] text-vestara-text-dim hover:text-vestara-text"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        );

      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={`rounded-lg border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text outline-none w-40 ${monospace ? 'font-mono' : ''}`}
          />
        );

      default: // display
        return (
          <span className={`text-xs text-vestara-text ${monospace ? 'font-mono' : ''}`}>{value || '—'}</span>
        );
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-vestara-text-muted block truncate">{label}</span>
        {description && <p className="text-[10px] text-vestara-text-dim mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {saved && <span className="text-[10px] text-vestara-success">Saved</span>}
        {renderInput()}
      </div>
    </div>
  );
}
