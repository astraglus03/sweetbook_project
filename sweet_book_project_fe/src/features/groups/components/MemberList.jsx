import { useRemoveMember, useTransferOwner } from '../hooks/useGroups';

export function MemberList({ groupId, members, currentUserId, ownerId }) {
  const removeMember = useRemoveMember();
  const transferOwner = useTransferOwner();
  const isOwner = currentUserId === ownerId;

  const handleKick = (userId, userName) => {
    if (!window.confirm(`${userName}님을 강퇴하시겠습니까?`)) return;
    removeMember.mutate({ groupId, userId });
  };

  const handleTransfer = (userId, userName) => {
    if (!window.confirm(`${userName}님에게 방장을 위임하시겠습니까?`)) return;
    transferOwner.mutate({ groupId, newOwnerId: userId });
  };

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        멤버 ({members.length})
      </h3>
      <ul className="divide-y divide-gray-100">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
              {member.userAvatarUrl ? (
                <img
                  src={member.userAvatarUrl}
                  alt={member.userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-500">
                  {member.userName?.[0] ?? '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {member.userName}
                </span>
                {member.role === 'OWNER' && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded">
                    방장
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                사진 {member.uploadCount}장
              </span>
            </div>
            {isOwner && member.userId !== currentUserId && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleTransfer(member.userId, member.userName)}
                  className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                >
                  위임
                </button>
                <button
                  type="button"
                  onClick={() => handleKick(member.userId, member.userName)}
                  className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  강퇴
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
