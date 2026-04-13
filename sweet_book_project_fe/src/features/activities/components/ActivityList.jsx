import { useActivities } from '../hooks/useActivities';

const TYPE_ICONS = {
  PHOTO_UPLOADED: '📷',
  BOOK_CREATED: '📘',
  ORDER_PLACED: '🛒',
  MEMBER_JOINED: '🙋',
  KAKAO_IMPORTED: '💬',
  PERSONAL_BOOK_READY: '✨',
  COVER_VOTED: '👍',
  BOOK_FINALIZED: '🎉',
};

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 py-4 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-warm-border flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-warm-border rounded" />
        <div className="h-3 w-1/4 bg-warm-border rounded" />
      </div>
    </div>
  );
}

export function ActivityList({ groupId }) {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useActivities(groupId);

  const items = data?.pages.flatMap((p) => p.items ?? []) ?? [];

  if (isLoading) {
    return (
      <div className="divide-y divide-warm-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-ink-muted mb-4">활동을 불러오지 못했어요</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-2xl mb-3">📭</p>
        <p className="text-sm text-ink-muted">아직 활동이 없어요</p>
        <p className="text-xs text-ink-muted mt-1">사진을 업로드하거나 멤버를 초대해보세요</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-warm-border">
        {items.map((item) => {
          const initial = item.actor?.userName?.[0]?.toUpperCase() ?? '?';
          return (
            <li key={item.id} className="flex items-start gap-3 py-4">
              {/* Actor avatar */}
              <div className="flex-shrink-0 relative">
                {item.actor?.avatarUrl ? (
                  <img
                    src={item.actor.avatarUrl}
                    alt={item.actor.userName}
                    className="w-9 h-9 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-brand/15 flex items-center justify-center text-brand font-semibold text-sm">
                    {initial}
                  </div>
                )}
                {/* Type icon badge */}
                <span className="absolute -bottom-0.5 -right-0.5 text-[13px] leading-none">
                  {TYPE_ICONS[item.type] ?? '•'}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink leading-snug">{item.message}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Load more button */}
      {hasNextPage && (
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-5 py-2 rounded-full border border-warm-border text-sm text-ink-sub hover:bg-warm-bg transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
          </button>
        </div>
      )}
    </div>
  );
}
