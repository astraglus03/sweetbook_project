import { useNavigate } from 'react-router-dom';

const STATUS_LABELS = {
  COLLECTING: '사진 수집중',
  EDITING: '편집중',
  VOTING: '투표중',
  ORDERED: '주문 완료',
  COMPLETED: '배송 완료',
};

const STATUS_COLORS = {
  COLLECTING: 'bg-brand-light text-brand',
  EDITING: 'bg-yellow-100 text-yellow-700',
  VOTING: 'bg-purple-100 text-purple-700',
  ORDERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-warm-bg text-ink-muted',
};

export function GroupCard({ group }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/groups/${group.id}`)}
      className="w-full text-left bg-white rounded-xl border border-warm-border overflow-hidden hover:shadow-md transition-shadow
        flex flex-row sm:flex-col"
    >
      {/* Cover image */}
      <div className="w-[100px] h-[100px] flex-shrink-0 sm:w-full sm:h-36 relative">
        {group.coverImage ? (
          <img
            src={group.coverImage}
            alt={group.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-light to-warm-bg">
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 text-brand opacity-60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {/* Status badge — desktop only (absolute) */}
        <span
          className={`hidden sm:inline-flex absolute top-2 right-2 px-2.5 py-0.5 text-[11px] font-medium rounded-full ${STATUS_COLORS[group.status] ?? 'bg-warm-bg text-ink-muted'}`}
        >
          {STATUS_LABELS[group.status] ?? group.status}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4 flex flex-col justify-center gap-1.5 sm:gap-0 flex-1 min-w-0">
        {/* Status badge — mobile only (inline) */}
        <span
          className={`inline-flex sm:hidden self-start px-1.5 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[group.status] ?? 'bg-warm-bg text-ink-muted'}`}
        >
          {STATUS_LABELS[group.status] ?? group.status}
        </span>

        <h3 className="text-sm sm:text-base font-semibold text-ink truncate">
          {group.name}
        </h3>

        {group.description && (
          <p className="text-xs sm:text-[13px] text-ink-sub line-clamp-1 sm:line-clamp-2 sm:mt-1">
            {group.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px] sm:text-xs text-ink-muted sm:mt-2">
          <span>{group.memberCount ?? 0}명</span>
          {group.eventDate && (
            <span>{new Date(group.eventDate).toLocaleDateString('ko-KR')}</span>
          )}
        </div>
      </div>
    </button>
  );
}
