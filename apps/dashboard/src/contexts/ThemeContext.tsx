import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  font: string;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  setFont: (font: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const FONT_KEY = 'vestara_font';
const THEME_KEY = 'vestara_theme';

// Detect system preference
function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Apply theme to DOM immediately (called before React mounts to prevent flash)
function applyThemeToDOM(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  if (resolved === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}

// Apply font to DOM immediately
function applyFontToDOM(font: string) {
  document.documentElement.style.setProperty('--font-family', font);
}

// Initialize theme and font synchronously from localStorage before React renders
// This prevents flash of wrong theme
const initialTheme = (localStorage.getItem(THEME_KEY) as Theme) || 'dark';
const initialFont = localStorage.getItem(FONT_KEY) || 'Plus Jakarta Sans';
applyThemeToDOM(initialTheme);
applyFontToDOM(initialFont);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [font, setFontState] = useState<string>(initialFont);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const initialized = useRef(false);

  const resolvedTheme: ResolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyThemeToDOM('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Load settings from server when auth is ready
  useEffect(() => {
    if (!token || settingsLoaded) return;
    (async () => {
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const settings = data.settings || {};

          const serverTheme = settings.theme as Theme | undefined;
          const serverFont = settings.font as string | undefined;

          // Server values take precedence, but only if they exist
          if (serverTheme && serverTheme !== theme) {
            setThemeState(serverTheme);
            localStorage.setItem(THEME_KEY, serverTheme);
            applyThemeToDOM(serverTheme);
          }
          if (serverFont && serverFont !== font) {
            setFontState(serverFont);
            localStorage.setItem(FONT_KEY, serverFont);
            applyFontToDOM(serverFont);
          }
        }
      } catch {
        // Server not available, keep local values
      } finally {
        setSettingsLoaded(true);
      }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    applyThemeToDOM(newTheme);

    // Also persist to server if authenticated
    if (token) {
      fetch(`/api/settings/${encodeURIComponent('theme')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newTheme }),
      }).catch(() => {});
    }
  }, [token]);

  const setFont = useCallback((newFont: string) => {
    setFontState(newFont);
    localStorage.setItem(FONT_KEY, newFont);
    applyFontToDOM(newFont);

    if (token) {
      fetch(`/api/settings/${encodeURIComponent('font')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newFont }),
      }).catch(() => {});
    }
  }, [token]);

  return (
    <ThemeContext.Provider value={{ theme, font, resolvedTheme, setTheme, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
