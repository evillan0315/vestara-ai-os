import { useState, useRef, useEffect, useCallback } from 'react';

interface BrowserEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  icon: string;
}

interface CwdInputProps {
  value: string;
  onChange: (value: string) => void;
  token: string | null;
  onBrowse: () => void;
}

function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return path.replace('~', '/home/ai');
  }
  return path;
}

export function CwdInput({ value, onChange, token, onBrowse }: CwdInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const expandedInput = expandPath(input);
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(expandedInput)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const dirs = (data.entries || [])
          .filter((e: BrowserEntry) => e.type === 'directory')
          .map((e: BrowserEntry) => e.path);
        setSuggestions(dirs.slice(0, 10));
      }
    } catch {}
  }, [token]);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
      setShowSuggestions(true);
    }, 200);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const selectSuggestion = (path: string) => {
    onChange(path);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={() => { fetchSuggestions(value); setShowSuggestions(true); }}
          placeholder="/path/to/project"
          className="w-64 rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs font-mono text-vestara-text outline-none focus:border-vestara-gold/50"
        />
        <button
          onClick={onBrowse}
          className="rounded border border-vestara-glass-border bg-vestara-bg px-2 py-1 text-xs text-vestara-text-muted hover:text-vestara-text hover:bg-vestara-glass"
          title="Browse directories"
        >
          ...
        </button>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-vestara-glass-border bg-vestara-bg shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => selectSuggestion(suggestion)}
              className="flex w-full items-center gap-2 border-b border-vestara-glass-border px-3 py-2 text-left text-xs font-mono text-vestara-text last:border-0 hover:bg-vestara-gold/10"
            >
              <span>📁</span>
              <span className="truncate">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
