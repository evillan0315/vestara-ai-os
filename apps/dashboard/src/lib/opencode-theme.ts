/**
 * Vestara AI OS theme for OpenCode web UI.
 *
 * OpenCode reads custom theme CSS from localStorage keys:
 *   opencode-theme-css-dark  / opencode-theme-css-light
 *
 * This file is NOT imported directly — it is loaded at runtime
 * and injected into the iframe via a <style> tag.
 */

export const VESTARA_THEME_DARK = `
/* Vestara AI OS — OpenCode dark theme */
:root {
  /* Background palette */
  --v2-background-bg-deep:        #06060C;
  --v2-background-bg-base:        #0F0F19;
  --v2-background-bg-layer-01:    #0F0F19;
  --v2-background-bg-layer-02:    #161625;
  --v2-background-bg-layer-03:    #1C1C2E;
  --v2-background-bg-layer-04:    #232338;
  --v2-background-bg-contrast:    #0A0A14;
  --v2-background-bg-inverse:     #E8ECF1;
  --v2-background-bg-accent:      #4F8CFF;
  --v2-background-bg-button-neutral: rgba(255,255,255,0.04);

  /* Grey palette — mapped from Vestara surfaces */
  --v2-grey-50:   #E8ECF1;
  --v2-grey-100:  #D0D5DD;
  --v2-grey-200:  #B8BFC9;
  --v2-grey-300:  #8892A4;
  --v2-grey-400:  #6B7589;
  --v2-grey-500:  #505A6E;
  --v2-grey-600:  #3D4558;
  --v2-grey-700:  #2A3042;
  --v2-grey-800:  #1C1C2E;
  --v2-grey-900:  #161625;
  --v2-grey-1000: #0F0F19;
  --v2-grey-1100: #0A0A14;
  --v2-grey-1200: #06060C;

  /* Text palette */
  --v2-text-text-base:        #E8ECF1;
  --v2-text-text-muted:       #8892A4;
  --v2-text-text-faint:       #505A6E;
  --v2-text-text-contrast:    #06060C;
  --v2-text-text-inverse:     #06060C;
  --v2-text-text-accent:      #C9A84C;
  --v2-text-text-accent-hover:#E4C76B;
  --v2-text-text-code-accent: #4F8CFF;

  /* Gold accent — primary brand */
  --v2-yellow-300: #E4C76B;
  --v2-yellow-400: #D4B85C;
  --v2-yellow-500: #C9A84C;
  --v2-yellow-800: #8B7333;
  --v2-yellow-900: #6B5A28;

  /* Blue accent */
  --v2-blue-300:  #7AA8FF;
  --v2-blue-400:  #4F8CFF;
  --v2-blue-600:  #3A6FD8;
  --v2-blue-700:  #2C5AB8;
  --v2-blue-800:  #1E4298;
  --v2-blue-900:  #153078;

  /* Green / success */
  --v2-green-300: #4ADE80;
  --v2-green-400: #22C55E;
  --v2-green-600: #16A34A;
  --v2-green-700: #15803D;
  --v2-green-800: #166534;

  /* Red / error */
  --v2-red-300:   #FCA5A5;
  --v2-red-400:   #F87171;
  --v2-red-500:   #EF4444;
  --v2-red-600:   #DC2626;
  --v2-red-700:   #B91C1C;
  --v2-red-800:   #991B1B;

  /* Purple */
  --v2-purple-300: #C4B5FD;
  --v2-purple-400: #A78BFA;
  --v2-purple-700: #7C3AED;
  --v2-purple-800: #6D28D9;

  /* Pink */
  --v2-pink-300:  #F9A8D4;
  --v2-pink-400:  #F472B6;
  --v2-pink-800:  #BE185D;

  /* Cyan */
  --v2-cyan-300:  #67E8F9;
  --v2-cyan-400:  #22D3EE;
  --v2-cyan-800:  #155E75;

  /* Alpha overlays — match Vestara glass */
  --v2-alpha-dark-0:   #0000;
  --v2-alpha-dark-2:   rgba(0,0,0,0.02);
  --v2-alpha-dark-4:   rgba(0,0,0,0.04);
  --v2-alpha-dark-6:   rgba(0,0,0,0.06);
  --v2-alpha-dark-8:   rgba(0,0,0,0.08);
  --v2-alpha-dark-10:  rgba(0,0,0,0.10);
  --v2-alpha-dark-12:  rgba(0,0,0,0.12);
  --v2-alpha-dark-14:  rgba(0,0,0,0.14);
  --v2-alpha-dark-16:  rgba(0,0,0,0.16);
  --v2-alpha-dark-20:  rgba(0,0,0,0.20);
  --v2-alpha-dark-24:  rgba(0,0,0,0.24);
  --v2-alpha-dark-30:  rgba(0,0,0,0.30);
  --v2-alpha-dark-40:  rgba(0,0,0,0.40);
  --v2-alpha-dark-50:  rgba(0,0,0,0.50);
  --v2-alpha-dark-60:  rgba(0,0,0,0.60);
  --v2-alpha-dark-70:  rgba(0,0,0,0.70);
  --v2-alpha-dark-80:  rgba(0,0,0,0.80);
  --v2-alpha-dark-90:  rgba(0,0,0,0.90);
  --v2-alpha-dark-100: #000;

  /* Agent badges — match Vestara palette */
  --v2-agent-plan-background:     rgba(155,109,255,0.08);
  --v2-agent-plan-border:         rgba(155,109,255,0.20);
  --v2-agent-plan-solid:          #9B6DFF;
  --v2-agent-build-background:    rgba(79,140,255,0.08);
  --v2-agent-build-border:        rgba(79,140,255,0.20);
  --v2-agent-build-solid:         #4F8CFF;
  --v2-agent-explore-background:  rgba(201,168,76,0.08);
  --v2-agent-explore-border:      rgba(201,168,76,0.20);
  --v2-agent-explore-solid:       #C9A84C;
  --v2-agent-review-solid:        #22C55E;
  --v2-agent-writer-solid:        #9B6DFF;
}

/* Body overrides to match Vestara */
body {
  background: #06060C !important;
  color: #E8ECF1 !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

/* Force dark color scheme */
:root { color-scheme: dark; }
`;

export const VESTARA_THEME_LIGHT = `
/* Vestara AI OS — OpenCode light theme */
:root {
  --v2-background-bg-deep:        #FAFAF8;
  --v2-background-bg-base:        #F5F5F0;
  --v2-background-bg-layer-01:    #FFFFFF;
  --v2-background-bg-layer-02:    #F0EFEA;
  --v2-background-bg-layer-03:    #E8E7E2;
  --v2-background-bg-layer-04:    #D9D8D3;
  --v2-background-bg-contrast:    #FFFFFF;
  --v2-background-bg-inverse:     #06060C;
  --v2-background-bg-accent:      #3A6FD8;
  --v2-background-bg-button-neutral: rgba(0,0,0,0.04);

  --v2-grey-50:   #06060C;
  --v2-grey-100:  #1C1C2E;
  --v2-grey-200:  #2A3042;
  --v2-grey-300:  #505A6E;
  --v2-grey-400:  #6B7589;
  --v2-grey-500:  #8892A4;
  --v2-grey-600:  #B8BFC9;
  --v2-grey-700:  #D0D5DD;
  --v2-grey-800:  #E0DFD8;
  --v2-grey-900:  #F0EFEA;
  --v2-grey-1000: #F5F5F0;
  --v2-grey-1100: #FAFAF8;
  --v2-grey-1200: #FFFFFF;

  --v2-text-text-base:        #06060C;
  --v2-text-text-muted:       #505A6E;
  --v2-text-text-faint:       #8892A4;
  --v2-text-text-contrast:    #FAFAF8;
  --v2-text-text-inverse:     #FAFAF8;
  --v2-text-text-accent:      #8B6914;
  --v2-text-text-accent-hover:#6B5A28;
  --v2-text-text-code-accent: #3A6FD8;

  --v2-yellow-300: #E4C76B;
  --v2-yellow-400: #D4B85C;
  --v2-yellow-500: #8B6914;
  --v2-yellow-800: #6B5A28;
  --v2-yellow-900: #4A3F1C;

  --v2-blue-300:  #7AA8FF;
  --v2-blue-400:  #3A6FD8;
  --v2-blue-600:  #2C5AB8;
  --v2-blue-700:  #1E4298;
  --v2-blue-800:  #153078;
  --v2-blue-900:  #0E2060;

  --v2-green-300: #4ADE80;
  --v2-green-400: #16A34A;
  --v2-green-600: #15803D;
  --v2-green-700: #166534;
  --v2-green-800: #14532D;

  --v2-red-300:   #FCA5A5;
  --v2-red-400:   #DC2626;
  --v2-red-500:   #B91C1C;
  --v2-red-600:   #991B1B;
  --v2-red-700:   #7F1D1D;
  --v2-red-800:   #612020;

  --v2-purple-300: #C4B5FD;
  --v2-purple-400: #7C3AED;
  --v2-purple-700: #6D28D9;
  --v2-purple-800: #5B21B6;

  --v2-pink-300:  #F9A8D4;
  --v2-pink-400:  #BE185D;
  --v2-pink-800:  #9D174D;

  --v2-cyan-300:  #67E8F9;
  --v2-cyan-400:  #155E75;
  --v2-cyan-800:  #0E4455;

  --v2-alpha-light-0:   #fff0;
  --v2-alpha-light-2:   rgba(255,255,255,0.02);
  --v2-alpha-light-4:   rgba(255,255,255,0.04);
  --v2-alpha-light-6:   rgba(255,255,255,0.06);
  --v2-alpha-light-8:   rgba(255,255,255,0.08);
  --v2-alpha-light-10:  rgba(255,255,255,0.10);
  --v2-alpha-light-12:  rgba(255,255,255,0.12);
  --v2-alpha-light-14:  rgba(255,255,255,0.14);
  --v2-alpha-light-16:  rgba(255,255,255,0.16);
  --v2-alpha-light-20:  rgba(255,255,255,0.20);
  --v2-alpha-light-24:  rgba(255,255,255,0.24);
  --v2-alpha-light-30:  rgba(255,255,255,0.30);
  --v2-alpha-light-40:  rgba(255,255,255,0.40);
  --v2-alpha-light-50:  rgba(255,255,255,0.50);
  --v2-alpha-light-60:  rgba(255,255,255,0.60);
  --v2-alpha-light-70:  rgba(255,255,255,0.70);
  --v2-alpha-light-80:  rgba(255,255,255,0.80);
  --v2-alpha-light-90:  rgba(255,255,255,0.90);
  --v2-alpha-light-100: #fff;

  --v2-agent-plan-background:     rgba(124,58,237,0.08);
  --v2-agent-plan-border:         rgba(124,58,237,0.20);
  --v2-agent-plan-solid:          #7C3AED;
  --v2-agent-build-background:    rgba(58,111,216,0.08);
  --v2-agent-build-border:        rgba(58,111,216,0.20);
  --v2-agent-build-solid:         #3A6FD8;
  --v2-agent-explore-background:  rgba(139,105,20,0.08);
  --v2-agent-explore-border:      rgba(139,105,20,0.20);
  --v2-agent-explore-solid:       #8B6914;
  --v2-agent-review-solid:        #16A34A;
  --v2-agent-writer-solid:        #7C3AED;
}

body {
  background: #FAFAF8 !important;
  color: #06060C !important;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }

:root { color-scheme: light; }
`;

const THEME_STORAGE_KEY = 'opencode-theme-id';
const THEME_CSS_DARK_KEY = 'opencode-theme-css-dark';
const THEME_CSS_LIGHT_KEY = 'opencode-theme-css-light';
const COLOR_SCHEME_KEY = 'opencode-color-scheme';
const VESTARA_THEME_ID = 'vestara-ai-os';

/**
 * Pre-seeds OpenCode's localStorage so the web UI loads with
 * the Vestara theme on first paint (before the iframe renders).
 *
 * Must be called from the parent page while same-origin.
 */
export function seedVestaraThemeInIframe(iframe: HTMLIFrameElement) {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;

    const ls = iframe.contentWindow?.localStorage;
    if (!ls) return;

    ls.setItem(THEME_STORAGE_KEY, VESTARA_THEME_ID);
    ls.setItem(COLOR_SCHEME_KEY, 'dark');
    ls.setItem(THEME_CSS_DARK_KEY, VESTARA_THEME_DARK);
    ls.setItem(THEME_CSS_LIGHT_KEY, VESTARA_THEME_LIGHT);
  } catch {
    // Cross-origin — cannot access iframe localStorage.
    // Fall back to CSS injection.
  }
}

/**
 * Injects Vestara theme CSS into the iframe via a <style> tag.
 * Works even when localStorage is cross-origin.
 */
export function injectVestaraTheme(iframe: HTMLIFrameElement, theme: 'dark' | 'light' = 'dark') {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;

    // Remove any previously injected Vestara theme
    const existing = doc.getElementById('vestara-opencode-theme');
    if (existing) existing.remove();

    const style = doc.createElement('style');
    style.id = 'vestara-opencode-theme';
    style.textContent = theme === 'dark' ? VESTARA_THEME_DARK : VESTARA_THEME_LIGHT;
    doc.head.appendChild(style);
  } catch {
    // Cross-origin — cannot inject.
  }
}
