import { useToast } from '../contexts/ToastContext';

const TYPE_STYLES: Record<string, string> = {
  success: 'border-green-500/30 text-green-400',
  error: 'border-red-500/30 text-red-400',
  info: 'border-vestara-blue/30 text-vestara-blue',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast-enter glass border rounded-lg px-3 md:px-4 py-2.5 text-xs md:text-sm shadow-xl cursor-pointer ${TYPE_STYLES[t.type] || TYPE_STYLES.info}`}
          onClick={() => removeToast(t.id)}
          role="alert"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex-1">{t.message}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeToast(t.id); }}
              className="text-[10px] opacity-60 hover:opacity-100 shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
