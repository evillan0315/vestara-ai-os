import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Helper to get computed styles
function getComputedStyleUnsafe(element: Element): CSSStyleDeclaration {
  return window.getComputedStyle(element);
}

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  font: string;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  setFont: (font: string) => void;
  setFontSize: (size: string) => void;
  setUIDensity: (density: string) => void;
  setBorderRadius: (radius: string) => void;
  setScrollbarStyle: (style: string) => void;
  fontSize: string;
  uiDensity: string;
  borderRadius: string;
  scrollbarStyle: string;
  currentColors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };
  setCurrentColors: (colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  }) => void;
  isCustomizing: boolean;
  setIsCustomizing: (value: boolean) => void;
  applyCustomColors: (colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  }) => void;
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
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
}

// Apply font to DOM immediately
function applyFontToDOM(font: string) {
  document.documentElement.style.setProperty('--font-family', font);
}

// Apply font size to DOM
function applyFontSizeToDOM(size: string) {
  const sizeMap = {
    'small': '14px',
    'medium': '16px',
    'large': '18px',
    'xlarge': '20px',
  };
  document.documentElement.style.setProperty('--font-size-base', sizeMap[size as keyof typeof sizeMap] || '16px');
}

// Apply UI density to DOM
function applyUIDensityToDOM(density: string) {
  const densityMap = {
    'compact': '0.85',
    'comfortable': '1.0',
    'spacious': '1.2',
  };
  document.documentElement.style.setProperty('--ui-density', densityMap[density as keyof typeof densityMap] || '1.0');
}

// Apply border radius to DOM
function applyBorderRadiusToDOM(radius: string) {
  const radiusMap = {
    'small': '4px',
    'medium': '8px',
    'large': '12px',
    'xlarge': '16px',
  };
  document.documentElement.style.setProperty('--border-radius', radiusMap[radius as keyof typeof radiusMap] || '8px');
}

// Apply scrollbar style to DOM
function applyScrollbarStyleToDOM(style: string) {
  if (style === 'thin') {
    document.documentElement.style.setProperty('--scrollbar-width', '6px');
    document.documentElement.classList.add('thin-scrollbar');
    document.documentElement.classList.remove('visible-scrollbar');
  } else if (style === 'visible') {
    document.documentElement.style.setProperty('--scrollbar-width', '12px');
    document.documentElement.classList.add('visible-scrollbar');
    document.documentElement.classList.remove('thin-scrollbar');
  } else if (style === 'auto') {
    document.documentElement.style.setProperty('--scrollbar-width', '6px');
    document.documentElement.classList.remove('thin-scrollbar', 'visible-scrollbar');
  } else {
    document.documentElement.style.setProperty('--scrollbar-width', '6px');
    document.documentElement.classList.remove('thin-scrollbar', 'visible-scrollbar');
  }
}

// Initialize theme and font synchronously from localStorage before React renders
// This prevents flash of wrong theme
const initialTheme = (localStorage.getItem(THEME_KEY) as Theme) || 'dark';
const initialFont = localStorage.getItem(FONT_KEY) || 'Plus Jakarta Sans';
applyThemeToDOM(initialTheme);
applyFontToDOM(initialFont);

// Initialize scrollbar style from localStorage or settings
let initialScrollbarStyle = 'system';
try {
  const savedStyle = localStorage.getItem('vestara_scrollbar_style');
  if (savedStyle && ['thin', 'visible', 'system'].includes(savedStyle)) {
    initialScrollbarStyle = savedStyle as 'thin' | 'visible' | 'system';
  }
} catch {}
applyScrollbarStyleToDOM(initialScrollbarStyle);

// Initialize UI density from localStorage
let initialUIDensity = 'comfortable';
try {
  const savedDensity = localStorage.getItem('vestara_ui_density');
  if (savedDensity && ['compact', 'comfortable', 'spacious'].includes(savedDensity)) {
    initialUIDensity = savedDensity as 'compact' | 'comfortable' | 'spacious';
  }
} catch {}
applyUIDensityToDOM(initialUIDensity);

// Initialize border radius from localStorage
let initialBorderRadius = 'medium';
try {
  const savedRadius = localStorage.getItem('vestara_border_radius');
  if (savedRadius && ['small', 'medium', 'large', 'xlarge'].includes(savedRadius)) {
    initialBorderRadius = savedRadius as 'small' | 'medium' | 'large' | 'xlarge';
  }
} catch {}
applyBorderRadiusToDOM(initialBorderRadius);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [font, setFontState] = useState<string>(initialFont);
  const [fontSize, setFontSizeState] = useState<string>('medium');
  const [uiDensity, setUIDensityState] = useState<string>('comfortable');
  const [borderRadius, setBorderRadiusState] = useState<string>('medium');
  const [scrollbarStyle, setScrollbarStyleState] = useState<string>('system');
  const [currentColors, setCurrentColorsState] = useState({
    primary: getComputedStyleUnsafe(document.documentElement).getPropertyValue('--color-vestara-gold') || '#C9A84C',
    secondary: getComputedStyleUnsafe(document.documentElement).getPropertyValue('--color-vestara-blue') || '#4F8CFF',
    success: getComputedStyleUnsafe(document.documentElement).getPropertyValue('--color-vestara-success') || '#22C55E',
    warning: getComputedStyleUnsafe(document.documentElement).getPropertyValue('--color-vestara-warning') || '#F59E0B',
    error: getComputedStyleUnsafe(document.documentElement).getPropertyValue('--color-vestara-error') || '#EF4444',
  });
  const [isCustomizing, setIsCustomizingState] = useState(false);
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
          const serverFontSize = settings.fontSize as string | undefined;
          const serverUIDensity = settings.uiDensity as string | undefined;
          const serverBorderRadius = settings.borderRadius as string | undefined;
          const serverScrollbarStyle = settings.scrollbarStyle as string | undefined;

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
          if (serverFontSize && serverFontSize !== fontSize) {
            setFontSizeState(serverFontSize);
            applyFontSizeToDOM(serverFontSize);
          }
          if (serverUIDensity && serverUIDensity !== uiDensity) {
            setUIDensityState(serverUIDensity);
            applyUIDensityToDOM(serverUIDensity);
          }
          if (serverBorderRadius && serverBorderRadius !== borderRadius) {
            setBorderRadiusState(serverBorderRadius);
            applyBorderRadiusToDOM(serverBorderRadius);
          }
          if (serverScrollbarStyle && serverScrollbarStyle !== scrollbarStyle) {
            setScrollbarStyleState(serverScrollbarStyle);
            applyScrollbarStyleToDOM(serverScrollbarStyle);
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

  const setFontSize = useCallback((newFontSize: string) => {
    setFontSizeState(newFontSize);
    applyFontSizeToDOM(newFontSize);

    if (token) {
      fetch(`/api/settings/${encodeURIComponent('fontSize')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newFontSize }),
      }).catch(() => {});
    }
  }, [token]);

  const setUIDensity = useCallback((newDensity: string) => {
    setUIDensityState(newDensity);
    applyUIDensityToDOM(newDensity);

    if (token) {
      fetch(`/api/settings/${encodeURIComponent('uiDensity')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newDensity }),
      }).catch(() => {});
    }
  }, [token]);

  const setBorderRadius = useCallback((newRadius: string) => {
    setBorderRadiusState(newRadius);
    applyBorderRadiusToDOM(newRadius);

    if (token) {
      fetch(`/api/settings/${encodeURIComponent('borderRadius')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newRadius }),
      }).catch(() => {});
    }
  }, [token]);

  const setScrollbarStyle = useCallback((newStyle: string) => {
    setScrollbarStyleState(newStyle);
    applyScrollbarStyleToDOM(newStyle);

    if (token) {
      fetch(`/api/settings/${encodeURIComponent('scrollbarStyle')}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newStyle }),
      }).catch(() => {});
    }
  }, [token]);

  const setCurrentColors = useCallback((newColors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  }) => {
    setCurrentColorsState(newColors);
    const root = document.documentElement;
    root.style.setProperty('--color-vestara-gold', newColors.primary);
    root.style.setProperty('--color-vestara-blue', newColors.secondary);
    root.style.setProperty('--color-vestara-success', newColors.success);
    root.style.setProperty('--color-vestara-warning', newColors.warning);
    root.style.setProperty('--color-vestara-error', newColors.error);
    
    if (token) {
      fetch(`/api/settings/colors`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newColors }),
      }).catch(() => {});
    }
  }, [token]);

  const setIsCustomizing = useCallback((value: boolean) => {
    setIsCustomizingState(value);
  }, []);

  const applyCustomColors = useCallback((colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  }) => {
    setCurrentColors(colors);
    const root = document.documentElement;
    root.style.setProperty('--color-vestara-gold', colors.primary);
    root.style.setProperty('--color-vestara-blue', colors.secondary);
    root.style.setProperty('--color-vestara-success', colors.success);
    root.style.setProperty('--color-vestara-warning', colors.warning);
    root.style.setProperty('--color-vestara-error', colors.error);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, font, resolvedTheme, setTheme, setFont, setFontSize, setUIDensity, setBorderRadius, setScrollbarStyle, fontSize, uiDensity, borderRadius, scrollbarStyle, currentColors, setCurrentColors, isCustomizing, setIsCustomizing, applyCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
