import { useState, type ReactNode } from 'react';

interface SettingsCardProps {
  title: string;
  icon?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function SettingsCard({ title, icon, children, defaultOpen = true, className = '' }: SettingsCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`glass p-5 ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left mb-0"
      >
        {icon && <span className="text-lg">{icon}</span>}
        <h2 className="text-sm font-semibold text-vestara-gold flex-1">{title}</h2>
        <svg
          className={`w-4 h-4 text-vestara-text-dim transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-3 space-y-1 divide-y divide-vestara-glass-border/30">{children}</div>}
    </div>
  );
}
