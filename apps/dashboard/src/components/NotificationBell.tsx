import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from '../utils/time';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  createdAt: string;
}

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationBell({ notifications, unreadCount, onMarkRead, onMarkAllRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-vestara-glass-border text-vestara-text-muted hover:text-vestara-text hover:border-vestara-gold/30 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-vestara-error px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 glass rounded-xl border border-vestara-glass-border shadow-xl floating-actions">
          <div className="flex items-center justify-between border-b border-vestara-glass-border px-4 py-2.5">
            <span className="text-xs font-semibold text-vestara-text">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} className="text-[10px] text-vestara-gold hover:text-vestara-gold-light transition-colors">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-vestara-text-dim">All caught up!</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-vestara-glass transition-colors border-b border-vestara-glass-border last:border-0"
                >
                  <p className="text-xs font-medium text-vestara-text truncate">{n.title}</p>
                  <p className="text-[10px] text-vestara-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[9px] text-vestara-text-dim mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt))}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
