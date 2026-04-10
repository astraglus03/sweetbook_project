import { useState } from 'react';
import { useRemoveMember, useTransferOwner } from '../hooks/useGroups';

export function MemberList({ groupId, members, currentUserId, ownerId, inviteCode }) {
  const removeMember = useRemoveMember();
  const transferOwner = useTransferOwner();
  const isOwner = currentUserId === ownerId;
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleKick = (userId, userName) => {
    if (!window.confirm(`${userName}님을 강퇴하시겠습니까?`)) return;
    removeMember.mutate({ groupId, userId });
  };

  const handleTransfer = (userId, userName) => {
    if (!window.confirm(`${userName}님에게 방장을 위임하시겠습니까?`)) return;
    transferOwner.mutate({ groupId, newOwnerId: userId });
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/join/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const roleLabel = (role) =>
    role === 'OWNER' ? '방장' : '멤버';

  const roleBadgeClass = (role) =>
    role === 'OWNER'
      ? 'bg-brand-light text-brand'
      : 'bg-warm-bg text-ink-sub';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-ink">
          멤버 관리 ({members.length}명)
        </h3>
        {inviteCode && (
          <button
            type="button"
            onClick={handleCopyInvite}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold text-white bg-brand hover:bg-brand-hover rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {inviteCopied ? '링크 복사됨!' : '멤버 초대'}
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-warm-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-warm-border bg-warm-bg/50">
              <th className="text-left text-xs font-semibold text-ink-muted px-4 py-3">멤버</th>
              <th className="text-left text-xs font-semibold text-ink-muted px-4 py-3 w-24">역할</th>
              <th className="text-left text-xs font-semibold text-ink-muted px-4 py-3 w-20">사진</th>
              {isOwner && (
                <th className="text-right text-xs font-semibold text-ink-muted px-4 py-3 w-24">관리</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-border">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-warm-bg/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-brand-light">
                      {member.userAvatarUrl ? (
                        <img src={member.userAvatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-medium text-brand">
                          {member.userName?.[0] ?? '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{member.userName}</p>
                      {member.userEmail && (
                        <p className="text-xs text-ink-muted truncate">{member.userEmail}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded ${roleBadgeClass(member.role)}`}>
                    {roleLabel(member.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ink-sub">
                  {member.uploadCount ?? 0}장
                </td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    {member.userId !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleKick(member.userId, member.userName)}
                        className="px-3 py-1 text-xs font-medium text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
                      >
                        강퇴
                      </button>
                    )}
                    {member.userId === currentUserId && (
                      <span className="text-xs text-ink-muted">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="sm:hidden space-y-2">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 bg-white rounded-xl border border-warm-border p-3">
            <div className="w-10 h-10 rounded-full bg-brand-light flex-shrink-0 overflow-hidden">
              {member.userAvatarUrl ? (
                <img src={member.userAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium text-brand">
                  {member.userName?.[0] ?? '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink truncate">{member.userName}</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${roleBadgeClass(member.role)}`}>
                  {roleLabel(member.role)}
                </span>
              </div>
              <span className="text-xs text-ink-muted">사진 {member.uploadCount ?? 0}장</span>
            </div>
            {isOwner && member.userId !== currentUserId && (
              <button
                type="button"
                onClick={() => handleKick(member.userId, member.userName)}
                className="px-2.5 py-1 text-xs text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors flex-shrink-0"
              >
                강퇴
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
