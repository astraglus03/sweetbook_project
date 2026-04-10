import { useState } from 'react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../features/notifications/hooks/useNotifications';

const TYPE_CONFIG = {
  UPLOAD_REMINDER: { icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', color: 'text-brand', bg: 'bg-brand/10' },
  DEADLINE_D3: { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-amber-500', bg: 'bg-amber-50' },
  DEADLINE_D1: { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-red-500', bg: 'bg-red-50' },
  VOTE_STARTED: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-purple-500', bg: 'bg-purple-50' },
  BOOK_READY: { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'text-green-600', bg: 'bg-green-50' },
  ORDER_STATUS: { icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-blue-500', bg: 'bg-blue-50' },
  GROUP_INVITE: { icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'text-brand', bg: 'bg-brand/10' },
};

const DEFAULT_TYPE = { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: 'text-ink-sub', bg: 'bg-warm-bg' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useNotifications({ page, limit: 20 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.notifications ?? [];
  const meta = data?.meta;

  const handleClick = (notif) => {
    if (!notif.isRead) {
      markAsRead.mutate(notif.id);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 lg:px-10 lg:max-w-3xl lg:mx-auto pt-8">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-20 bg-warm-border rounded-xl" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-warm-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 lg:px-10 lg:max-w-3xl lg:mx-auto pt-8 text-center py-20">
        <p className="text-sm text-red-500">알림을 불러오는데 실패했습니다</p>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-10 lg:max-w-3xl lg:mx-auto pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] lg:text-[24px] font-bold text-ink">알림</h1>
        {notifications.some((n) => !n.isRead) && (
          <button
            type="button"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="text-sm text-brand font-medium hover:underline"
          >
            모두 읽음
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warm-bg flex items-center justify-center">
            <svg className="w-8 h-8 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-sm text-ink-muted">아직 알림이 없습니다</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] ?? DEFAULT_TYPE;
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left flex gap-3.5 p-4 rounded-xl border transition-colors ${
                    notif.isRead
                      ? 'bg-white border-warm-border'
                      : 'bg-brand/[0.03] border-brand/20'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${cfg.bg}`}>
                    <svg className={`w-5 h-5 ${cfg.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={cfg.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${notif.isRead ? 'text-ink-sub' : 'text-ink font-medium'}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[11px] text-ink-muted mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6 pb-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-warm-border rounded-full text-ink-sub disabled:opacity-40 hover:bg-warm-bg transition-colors"
              >
                이전
              </button>
              <span className="text-sm text-ink-muted">{page} / {meta.totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="px-3 py-1.5 text-sm border border-warm-border rounded-full text-ink-sub disabled:opacity-40 hover:bg-warm-bg transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
