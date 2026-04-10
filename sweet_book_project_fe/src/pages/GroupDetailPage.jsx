import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupDetail, useLeaveGroup } from '../features/groups/hooks/useGroups';
import { useMe } from '../features/auth/hooks/useAuth';
import { MemberList } from '../features/groups/components/MemberList';
import { GroupSettings } from '../features/groups/components/GroupSettings';
import { PhotoGallery } from '../features/photos/components/PhotoGallery';
import { PhotoUploadModal } from '../features/photos/components/PhotoUploadModal';
import { GroupOrdersTab } from '../features/orders/components/GroupOrdersTab';

const TABS = [
  { key: 'photos', label: '사진' },
  { key: 'members', label: '멤버' },
  { key: 'books', label: '포토북' },
  { key: 'orders', label: '주문' },
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const isOwner = me && group && me.id === group.ownerId;

  const handleLeave = () => {
    if (!window.confirm('이 모임을 나가시겠습니까?')) return;
    leaveGroup.mutate(Number(groupId), {
      onSuccess: () => navigate('/groups'),
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="bg-ink px-4 py-8 lg:px-10">
          <div className="h-5 w-24 bg-white/10 rounded mb-4" />
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 lg:w-[120px] lg:h-[120px] bg-white/10 rounded-xl flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-40 bg-white/10 rounded" />
              <div className="h-4 w-64 bg-white/10 rounded" />
            </div>
          </div>
        </div>
        <div className="px-4 lg:px-10 py-5">
          <div className="h-40 bg-warm-border rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="px-4 text-center py-20">
        <p className="text-sm text-red-500 mb-4">모임을 찾을 수 없습니다</p>
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="text-sm text-brand hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const memberCount = group.memberCount ?? group.members?.length ?? 0;
  const photoCount = group.photoCount ?? 0;

  return (
    <div>
      {/* Dark header area */}
      <div className="bg-ink px-4 py-6 lg:py-8 lg:px-10">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          내 모임
        </button>

        {/* Group info row */}
        <div className="flex items-start gap-4 lg:gap-8">
          {/* Cover image */}
          <div className="w-14 h-14 lg:w-[120px] lg:h-[120px] rounded-[10px] lg:rounded-xl flex-shrink-0 overflow-hidden bg-white/10">
            {group.coverImage ? (
              <img
                src={group.coverImage}
                alt={group.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/30 to-brand/10">
                <svg
                  className="w-6 h-6 lg:w-10 lg:h-10 text-brand/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Status badge */}
            <span className="inline-flex px-2.5 py-0.5 bg-brand/25 text-brand text-xs font-medium rounded-full mb-2">
              {STATUS_LABELS[group.status] ?? group.status}
            </span>

            <h1 className="text-lg lg:text-2xl font-bold text-white truncate">
              {group.name}
            </h1>

            {group.description && (
              <p className="mt-1 text-sm text-white/50 line-clamp-2">
                {group.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
              <span>멤버 {memberCount}명</span>
              <span>사진 {photoCount}장</span>
              {group.eventDate && (
                <span className="hidden lg:inline">
                  {new Date(group.eventDate).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share — copy invite link */}
            <button
              type="button"
              onClick={async () => {
                const link = `${window.location.origin}/join/${group.inviteCode}`;
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
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              className={`h-9 flex items-center justify-center rounded-full transition-colors text-white ${
                shareCopied ? 'bg-green-500/30 px-3 gap-1.5' : 'w-9 bg-white/10 hover:bg-white/20'
              }`}
              title="초대 링크 복사"
            >
              {shareCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs font-medium">복사됨</span>
                </>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>

            {/* Upload */}
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              title="사진 업로드"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>

            {/* Settings gear (owner only) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen((v) => !v)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors text-white ${isSettingsOpen ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
                title="설정"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}

            {/* Leave (non-owner) */}
            {!isOwner && (
              <button
                type="button"
                onClick={handleLeave}
                disabled={leaveGroup.isPending}
                className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1"
              >
                나가기
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Settings panel (owner) */}
      {isOwner && isSettingsOpen && (
        <div className="bg-white border-b border-warm-border px-4 lg:px-10 py-5">
          <GroupSettings group={group} />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-warm-border">
        <div className="flex gap-0 px-5 lg:px-10 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 pt-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-muted hover:text-ink-sub'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 lg:px-10 py-5">
        {activeTab === 'photos' && (
          <PhotoGallery
            groupId={Number(groupId)}
            onUploadClick={() => setIsUploadOpen(true)}
          />
        )}
        {activeTab === 'members' && (
          <MemberList
            groupId={Number(groupId)}
            members={group.members ?? []}
            currentUserId={me?.id}
            ownerId={group.ownerId}
            inviteCode={group.inviteCode}
          />
        )}
        {activeTab === 'books' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-light flex items-center justify-center">
              <svg className="w-8 h-8 text-brand/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-sm text-ink mb-1">포토북을 만들어보세요</p>
            <p className="text-xs text-ink-muted mb-4">사진을 모아 멋진 포토북을 제작할 수 있습니다</p>
            <button
              type="button"
              onClick={() => navigate(`/groups/${groupId}/books/templates`)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors"
            >
              포토북 만들기
            </button>
          </div>
        )}
        {activeTab === 'orders' && (
          <GroupOrdersTab groupId={Number(groupId)} navigate={navigate} />
        )}
      </div>

      <PhotoUploadModal
        groupId={Number(groupId)}
        groupName={group.name}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </div>
  );
}
