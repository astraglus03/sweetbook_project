import { useNavigate } from 'react-router-dom';

const STATUS_LABELS = {
  COLLECTING: '수집 중',
  EDITING: '편집 중',
  VOTING: '투표 중',
  ORDERED: '주문 완료',
  COMPLETED: '완료',
};

const STATUS_COLORS = {
  COLLECTING: { bg: '#D4916E22', text: '#D4916E' },
  EDITING: { bg: '#4A90D922', text: '#4A90D9' },
  VOTING: { bg: '#9B59B622', text: '#9B59B6' },
  ORDERED: { bg: '#4CAF5022', text: '#4CAF50' },
  COMPLETED: { bg: '#4CAF5022', text: '#4CAF50' },
};

export function GroupCard({ group }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/groups/${group.id}`)}
      className="w-full text-left bg-white rounded-xl border border-warm-border overflow-hidden hover-lift
        flex flex-row sm:flex-col"
    >
      {/* Cover image */}
      <div className="w-[100px] h-[100px] flex-shrink-0 sm:w-full sm:h-[140px] relative overflow-hidden">
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
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4 flex flex-col justify-center gap-1.5 flex-1 min-w-0">
        {/* Status badge */}
        <span
          className="inline-flex self-start px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-full"
          style={{
            background: (STATUS_COLORS[group.status] ?? STATUS_COLORS.COLLECTING).bg,
            color: (STATUS_COLORS[group.status] ?? STATUS_COLORS.COLLECTING).text,
          }}
        >
          {STATUS_LABELS[group.status] ?? group.status}
        </span>

        <h3 className="text-[15px] sm:text-[16px] font-semibold text-ink truncate">
          {group.name}
        </h3>

        <p className="text-[12px] text-ink-muted truncate">
          멤버 {group.memberCount ?? 0} | 사진 {group.photoCount ?? 0}
          {group.uploadDeadline && ` | D-${Math.max(0, Math.ceil((new Date(group.uploadDeadline) - new Date()) / 86400000))}`}
        </p>
      </div>
    </button>
  );
}
