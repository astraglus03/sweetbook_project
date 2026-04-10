import { useState } from 'react';
import { useMyGroups } from '../features/groups/hooks/useGroups';
import { GroupCard } from '../features/groups/components/GroupCard';
import { EmptyGroups } from '../features/groups/components/EmptyGroups';
import { CreateGroupModal } from '../features/groups/components/CreateGroupModal';

export function GroupsPage() {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useMyGroups({ page, limit: 20 });

  const groups = data?.groups ?? [];
  const meta = data?.meta;

  if (isLoading) {
    return (
      <div className="px-4 lg:px-10 lg:max-w-6xl lg:mx-auto pt-8">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-32 bg-warm-border rounded-xl" />
            <div className="h-10 w-28 bg-warm-border rounded-full" />
          </div>
          {/* Mobile skeleton: vertical list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[100px] bg-warm-border rounded-xl" />
            ))}
          </div>
          {/* Desktop skeleton: grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 bg-warm-border rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 lg:px-10 lg:max-w-6xl lg:mx-auto pt-8 text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-light flex items-center justify-center">
          <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-ink mb-1">일시적인 오류가 발생했어요</p>
        <p className="text-xs text-ink-muted mb-4">잠시 후 다시 시도해주세요</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-5 py-2.5 text-sm font-medium text-brand bg-brand-light rounded-full hover:bg-brand/20 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-10 lg:max-w-6xl lg:mx-auto pt-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] lg:text-[24px] font-bold text-ink">
            내 모임
          </h1>
          <p className="text-[14px] text-ink-sub mt-1">
            모임과 포토북 프로젝트를 관리하세요
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-5 text-sm font-semibold text-white bg-brand hover:bg-brand-hover rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 모임
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyGroups onCreateClick={() => setIsCreateOpen(true)} />
      ) : (
        <>
          {/* Mobile: vertical list of horizontal cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
          {/* sm+: grid of vertical cards */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-warm-border rounded-full text-ink-sub disabled:opacity-40 hover:bg-warm-bg transition-colors"
              >
                이전
              </button>
              <span className="text-sm text-ink-muted">
                {page} / {meta.totalPages}
              </span>
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

      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
