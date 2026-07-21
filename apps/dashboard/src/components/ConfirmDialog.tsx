interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-overlay" onClick={onCancel}>
      <div className="modal-content glass rounded-lg p-5 md:p-6 w-full max-w-sm mx-3 border border-vestara-glass-border" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base md:text-lg font-bold text-vestara-text mb-2">{title}</h3>
        <p className="text-xs md:text-sm text-vestara-text-muted mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 bg-vestara-bg border border-vestara-glass-border rounded-lg text-sm text-vestara-text hover:bg-vestara-glass">
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
              variant === 'danger'
                ? 'bg-vestara-error text-white hover:bg-vestara-error/80'
                : 'btn-gold'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
