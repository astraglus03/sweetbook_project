import { useEffect, useRef } from 'react';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  onConfirm,
  onClose,
  isPending = false,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !isPending) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [open, isPending, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? 'confirm-desc' : undefined}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={() => !isPending && onClose?.()}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-base font-bold text-ink mb-2">
          {title}
        </h2>
        {description && (
          <p id="confirm-desc" className="text-sm text-ink-sub mb-5 whitespace-pre-line">
            {description}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-11 px-4 rounded-full border border-warm-border text-sm font-medium text-ink-sub hover:bg-warm-bg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`h-11 px-5 rounded-full text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand hover:bg-brand-hover'
            }`}
          >
            {isPending ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
