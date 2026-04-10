import { useParams, useNavigate } from 'react-router-dom';
import { useGroupByCode, useJoinGroup } from '../features/groups/hooks/useGroups';
import { useMe } from '../features/auth/hooks/useAuth';

export function JoinPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { data: group, isLoading, isError } = useGroupByCode(code);
  const { data: me } = useMe();
  const joinGroup = useJoinGroup();

  const handleJoin = () => {
    if (!group) return;
    joinGroup.mutate(
      { groupId: group.id, inviteCode: code },
      {
        onSuccess: () => navigate(`/groups/${group.id}`),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
        <div className="animate-pulse w-full max-w-md">
          <div className="bg-white rounded-2xl overflow-hidden border border-warm-border">
            <div className="h-[200px] bg-warm-border" />
            <div className="p-7 space-y-3">
              <div className="h-5 w-24 bg-warm-border rounded-full mx-auto" />
              <div className="h-7 w-48 bg-warm-border rounded mx-auto" />
              <div className="h-4 w-64 bg-warm-border rounded mx-auto" />
              <div className="h-12 bg-warm-border rounded-full mt-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-1">
            유효하지 않은 초대 링크
          </h2>
          <p className="text-sm text-ink-sub mb-6">
            초대 링크가 만료되었거나 존재하지 않습니다
          </p>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="text-sm text-brand hover:underline"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isAlreadyMember =
    joinGroup.isError &&
    joinGroup.error?.response?.data?.error?.code === 'GROUP_ALREADY_MEMBER';

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-warm-border overflow-hidden shadow-sm">
        {/* Cover image */}
        <div className="h-[200px] relative">
          {group.coverImage ? (
            <img
              src={group.coverImage}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-light to-warm-bg">
              <svg
                className="w-14 h-14 text-brand/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-7 text-center">
          {/* Status badge */}
          <span className="inline-flex px-2.5 py-1 bg-brand-light text-brand text-xs font-medium rounded-full mb-3">
            초대
          </span>

          <h2 className="font-display text-xl font-bold text-ink">{group.name}</h2>

          {group.description && (
            <p className="mt-2 text-sm text-ink-sub">{group.description}</p>
          )}

          <p className="mt-2 text-xs text-ink-muted">
            멤버 {group.memberCount}명
          </p>

          {!me ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-ink-sub">
                로그인 후 참여할 수 있습니다
              </p>
              <button
                type="button"
                onClick={() => navigate(`/login?redirect=/join/${code}`)}
                className="w-full h-12 text-sm font-semibold text-white bg-brand hover:bg-brand-hover rounded-full transition-colors"
              >
                로그인하기
              </button>
              <p className="text-xs text-ink-muted">
                계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={() => navigate(`/signup?redirect=/join/${code}`)}
                  className="text-brand hover:underline"
                >
                  회원가입
                </button>
              </p>
            </div>
          ) : isAlreadyMember ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-green-600 font-medium">
                이미 참여한 모임입니다
              </p>
              <button
                type="button"
                onClick={() => navigate(`/groups/${group.id}`)}
                className="w-full h-12 text-sm font-semibold text-white bg-brand hover:bg-brand-hover rounded-full transition-colors"
              >
                모임으로 이동
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinGroup.isPending}
                className="w-full h-12 text-sm font-semibold text-white bg-brand hover:bg-brand-hover rounded-full disabled:opacity-50 transition-colors"
              >
                {joinGroup.isPending ? '참여 중...' : '참여하기'}
              </button>
              {joinGroup.isError && !isAlreadyMember && (
                <p className="text-sm text-red-500">
                  참여에 실패했습니다. 다시 시도해주세요.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
