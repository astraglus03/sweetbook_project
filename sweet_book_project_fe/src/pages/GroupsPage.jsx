import { useState } from 'react';
import { useMyGroups } from '../features/groups/hooks/useGroups';
import { GroupCard } from '../features/groups/components/GroupCard';
import { EmptyGroups } from '../features/groups/components/EmptyGroups';
import { CreateGroupModal } from '../features/groups/components/CreateGroupModal';

export function GroupsPage() {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, isLoading, isError } = useMyGroups({ page, limit: 20 });

  const groups = data?.groups ?? [];
  const meta = data?.meta;

  if (isLoading) {
    return (
      <div className="p-4 lg:max-w-5xl lg:mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 mb-1">일시적인 오류가 발생했어요</p>
        <p className="text-xs text-gray-400 mb-4">잠시 후 다시 시도해주세요</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 lg:pb-4 lg:max-w-5xl lg:mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
          내 모임
        </h1>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + 모임 만들기
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyGroups onCreateClick={() => setIsCreateOpen(true)} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
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
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <span className="text-sm text-gray-500">
                {page} / {meta.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
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
