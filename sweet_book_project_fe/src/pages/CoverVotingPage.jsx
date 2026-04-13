import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useGroupDetail } from '../features/groups/hooks/useGroups';
import { useMe } from '../features/auth/hooks/useAuth';
import {
  useCoverCandidates,
  useDeleteCoverCandidate,
  useToggleCoverVote,
  useConfirmCoverCandidate,
} from '../features/cover-voting/hooks/useCoverVoting';
import { CoverPreview } from '../features/cover-voting/components/CoverPreview';
import { CoverCandidateModal } from '../features/cover-voting/components/CoverCandidateModal';
import { usePhotos } from '../features/photos/hooks/usePhotos';
import { specLabel } from '../features/books/lib/bookLabels';
import { booksApi } from '../features/books/api/books.api';

export function CoverVotingPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const gid = Number(groupId);

  const { data: group, isLoading: groupLoading } = useGroupDetail(gid);
  const { data: me } = useMe();
  const { data: candidates, isLoading, isError } = useCoverCandidates(gid);
  const { data: photoData } = usePhotos(gid, { limit: 200 });
  const photos = photoData?.photos ?? [];

  // 후보들이 쓰는 고유 bookSpecUid만 모아서 cover-templates를 병렬 fetch (캐시 10분)
  const uniqueSpecs = useMemo(() => {
    const set = new Set((candidates ?? []).map((c) => c.bookSpecUid).filter(Boolean));
    return Array.from(set);
  }, [candidates]);

  const specTemplateQueries = useQueries({
    queries: uniqueSpecs.map((s) => ({
      queryKey: ['books', 'cover-templates', s],
      queryFn: async () => {
        const res = await booksApi.getCoverTemplates(s);
        return res.data;
      },
      staleTime: 10 * 60 * 1000,
    })),
  });

  // templateUid → template 객체 매핑
  const templateByUid = useMemo(() => {
    const map = new Map();
    specTemplateQueries.forEach((q) => {
      if (Array.isArray(q.data)) {
        q.data.forEach((t) => {
          if (t?.templateUid) map.set(t.templateUid, t);
        });
      }
    });
    return map;
  }, [specTemplateQueries]);
  const deleteCandidate = useDeleteCoverCandidate(gid);
  const toggleVote = useToggleCoverVote(gid);
  const confirmCandidate = useConfirmCoverCandidate(gid);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [toast, setToast] = useState(null);

  const isOwner = me && group && me.id === group.ownerId;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleDelete = (id) => {
    if (!window.confirm('이 표지 후보를 삭제하시겠습니까?')) return;
    deleteCandidate.mutate(id);
  };

  const handleToggleVote = (id) => {
    toggleVote.mutate(id);
  };

  const handleConfirm = (id) => {
    if (!window.confirm('이 표지 후보로 확정하시겠습니까?')) return;
    setConfirmingId(id);
    confirmCandidate.mutate(id, {
      onSuccess: () => {
        setConfirmingId(null);
        showToast('표지가 확정됐어요! 포토북 만들기로 이동합니다');
        setTimeout(() => {
          navigate(`/groups/${groupId}/books/new?coverCandidateId=${id}`);
        }, 700);
      },
      onError: () => {
        setConfirmingId(null);
      },
    });
  };

  if (groupLoading || isLoading) {
    return (
      <div className="min-h-screen bg-warm-bg">
        <div className="bg-ink px-4 py-6 lg:px-10">
          <div className="h-4 w-32 bg-white/10 rounded mb-2 animate-pulse" />
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="p-4 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="bg-warm-border" style={{ aspectRatio: '3/4' }} />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-warm-border rounded w-3/4" />
                  <div className="h-3 bg-warm-border rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <p className="text-sm text-red-500">후보 목록을 불러오는데 실패했습니다</p>
      </div>
    );
  }

  const list = candidates ?? [];

  return (
    <div className="min-h-screen bg-warm-bg pb-24">
      {/* 헤더 */}
      <div className="bg-ink text-white px-4 py-6 lg:px-10">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="text-white/60 text-sm hover:text-white mb-3 flex items-center gap-1"
        >
          ← 모임으로
        </button>
        <h1 className="text-lg lg:text-xl font-semibold">{group?.name ?? ''}</h1>
        <p className="text-white/60 text-sm mt-1">멤버들이 투표해서 표지를 정해요</p>
      </div>

      <div className="px-4 lg:px-10 pt-5">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-ink/60">
            {list.length > 0 ? `후보 ${list.length}개` : ''}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
          >
            <span>+ 후보 추가</span>
          </button>
        </div>

        {/* 빈 상태 */}
        {list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-warm-border flex items-center justify-center mb-4">
              <span className="text-2xl">🖼</span>
            </div>
            <p className="text-sm font-medium text-ink">아직 표지 후보가 없어요</p>
            <p className="text-xs text-ink/50 mt-1">첫 후보를 추가해보세요</p>
          </div>
        )}

        {/* 후보 그리드 */}
        {list.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((candidate) => {
              const isConfirming = confirmingId === candidate.id;
              const canDelete = isOwner || candidate.creatorUserId === me?.id;

              return (
                <div key={candidate.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <CoverPreview
                    template={templateByUid.get(candidate.templateUid) ?? null}
                    templateUid={candidate.templateUid}
                    params={candidate.params ?? {}}
                    photos={photos}
                  />

                  <div className="p-3">
                    <p className="text-xs text-ink/40 mt-1">
                      {specLabel(candidate.bookSpecUid)}
                      {candidate.theme ? ` · ${candidate.theme}` : ''}
                      {' · '}{candidate.creatorName}
                    </p>
                    {candidate.templateName && (
                      <p className="text-[11px] text-ink/30 mt-0.5 truncate">
                        {candidate.templateName}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      {/* 투표 버튼 */}
                      <button
                        onClick={() => handleToggleVote(candidate.id)}
                        disabled={toggleVote.isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          candidate.votedByMe
                            ? 'bg-brand/10 text-brand'
                            : 'bg-warm-border text-ink/60 hover:bg-brand/10 hover:text-brand'
                        }`}
                      >
                        <span>{candidate.votedByMe ? '♥' : '♡'}</span>
                        <span>{candidate.voteCount}</span>
                      </button>

                      <div className="flex gap-2">
                        {/* 수정 (본인 후보 또는 방장) */}
                        {canDelete && (
                          <button
                            onClick={() => setEditingCandidate(candidate)}
                            className="text-xs text-ink/50 hover:text-brand transition-colors px-2 py-1"
                          >
                            수정
                          </button>
                        )}

                        {/* 삭제 */}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(candidate.id)}
                            disabled={deleteCandidate.isPending}
                            className="text-xs text-ink/30 hover:text-red-400 transition-colors px-2 py-1"
                          >
                            삭제
                          </button>
                        )}

                        {/* 확정 (방장) */}
                        {isOwner && (
                          <button
                            onClick={() => handleConfirm(candidate.id)}
                            disabled={isConfirming}
                            className="text-xs bg-ink text-white px-3 py-1.5 rounded-lg hover:bg-ink/80 transition-colors disabled:opacity-50"
                          >
                            {isConfirming ? '확정 중...' : '이걸로 확정'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <CoverCandidateModal groupId={gid} onClose={() => setIsModalOpen(false)} />
      )}
      {editingCandidate && (
        <CoverCandidateModal
          groupId={gid}
          candidate={editingCandidate}
          onClose={() => setEditingCandidate(null)}
        />
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
