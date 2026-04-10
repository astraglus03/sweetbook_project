import { useNavigate } from 'react-router-dom';

const STATUS_LABELS = {
  COLLECTING: '사진 수집중',
  EDITING: '편집중',
  VOTING: '투표중',
  ORDERED: '주문 완료',
  COMPLETED: '배송 완료',
};

const STATUS_COLORS = {
  COLLECTING: 'bg-blue-100 text-blue-700',
  EDITING: 'bg-yellow-100 text-yellow-700',
  VOTING: 'bg-purple-100 text-purple-700',
  ORDERED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
};

export function GroupCard({ group }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/groups/${group.id}`)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-32 sm:h-36 bg-gray-100 relative">
        {group.coverImage ? (
          <img
            src={group.coverImage}
            alt={group.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
            <svg
              className="w-10 h-10 text-indigo-300"
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
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[group.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {STATUS_LABELS[group.status] ?? group.status}
        </span>
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="text-base font-semibold text-gray-900 truncate">
          {group.name}
        </h3>
        {group.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {group.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span>{group.memberCount ?? 0}명</span>
          {group.eventDate && (
            <span>{new Date(group.eventDate).toLocaleDateString('ko-KR')}</span>
          )}
        </div>
      </div>
    </button>
  );
}
