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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-pulse w-full max-w-sm">
          <div className="h-6 w-40 bg-gray-200 rounded mx-auto mb-4" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            유효하지 않은 초대 링크
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            초대 링크가 만료되었거나 존재하지 않습니다
          </p>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="text-sm text-indigo-600 hover:underline"
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          {group.coverImage ? (
            <img
              src={group.coverImage}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </div>
        <div className="p-6 text-center">
          <h2 className="text-lg font-bold text-gray-900">{group.name}</h2>
          {group.description && (
            <p className="mt-1 text-sm text-gray-500">{group.description}</p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            멤버 {group.memberCount}명
          </p>

          {!me ? (
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-500">로그인 후 참여할 수 있습니다</p>
              <button
                type="button"
                onClick={() => navigate(`/login?redirect=/join/${code}`)}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                로그인하기
              </button>
            </div>
          ) : isAlreadyMember ? (
            <div className="mt-6 space-y-2">
              <p className="text-sm text-green-600 font-medium">
                이미 참여한 모임입니다
              </p>
              <button
                type="button"
                onClick={() => navigate(`/groups/${group.id}`)}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                모임으로 이동
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinGroup.isPending}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {joinGroup.isPending ? '참여 중...' : '참여하기'}
              </button>
              {joinGroup.isError && !isAlreadyMember && (
                <p className="mt-2 text-sm text-red-500">
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
