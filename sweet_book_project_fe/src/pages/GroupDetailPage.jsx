import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupDetail, useLeaveGroup } from '../features/groups/hooks/useGroups';
import { useMe } from '../features/auth/hooks/useAuth';
import { MemberList } from '../features/groups/components/MemberList';
import { GroupSettings } from '../features/groups/components/GroupSettings';

const TABS = [
  { key: 'photos', label: '사진' },
  { key: 'members', label: '멤버' },
  { key: 'settings', label: '설정' },
];

const STATUS_LABELS = {
  COLLECTING: '사진 수집중',
  EDITING: '편집중',
  VOTING: '투표중',
  ORDERED: '주문 완료',
  COMPLETED: '배송 완료',
};

export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { data: group, isLoading, isError } = useGroupDetail(Number(groupId));
  const { data: me } = useMe();
  const leaveGroup = useLeaveGroup();
  const [activeTab, setActiveTab] = useState('photos');

  const isOwner = me && group && me.id === group.ownerId;
  const visibleTabs = isOwner ? TABS : TABS.filter((t) => t.key !== 'settings');

  const handleLeave = () => {
    if (!window.confirm('이 모임을 나가시겠습니까?')) return;
    leaveGroup.mutate(Number(groupId), {
      onSuccess: () => navigate('/groups'),
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:max-w-3xl lg:mx-auto animate-pulse">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="p-4 text-center py-20">
        <p className="text-sm text-red-500 mb-4">모임을 찾을 수 없습니다</p>
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="text-sm text-indigo-600 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-4 lg:max-w-3xl lg:mx-auto">
      {/* 헤더 */}
      <div className="p-4">
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          내 모임
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              {group.name}
            </h1>
            {group.description && (
              <p className="mt-1 text-sm text-gray-500">{group.description}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                {STATUS_LABELS[group.status] ?? group.status}
              </span>
              <span>{group.memberCount ?? group.members?.length ?? 0}명</span>
              {group.eventDate && (
                <span>
                  {new Date(group.eventDate).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
          </div>
          {!isOwner && (
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaveGroup.isPending}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              나가기
            </button>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-gray-200 px-4">
        <div className="flex gap-6">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-4">
        {activeTab === 'photos' && (
          <div className="text-center py-16 text-sm text-gray-400">
            사진 갤러리는 다음 단계에서 구현됩니다
          </div>
        )}
        {activeTab === 'members' && (
          <MemberList
            groupId={Number(groupId)}
            members={group.members ?? []}
            currentUserId={me?.id}
            ownerId={group.ownerId}
          />
        )}
        {activeTab === 'settings' && isOwner && (
          <GroupSettings group={group} />
        )}
      </div>
    </div>
  );
}
