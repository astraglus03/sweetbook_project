export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-full bg-warm-bg flex items-center justify-center mb-4">
        {typeof icon === 'string' ? (
          <span className="text-2xl" aria-hidden="true">{icon}</span>
        ) : icon ?? (
          <svg className="w-7 h-7 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-ink mb-1">{title}</p>
      {description && (
        <p className="text-xs text-ink-sub mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
