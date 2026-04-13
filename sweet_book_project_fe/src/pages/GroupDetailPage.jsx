import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGroupDetail,
  useLeaveGroup,
  useFaceDetectionStatus,
} from '../features/groups/hooks/useGroups';
import { useMe } from '../features/auth/hooks/useAuth';
import { MemberList } from '../features/groups/components/MemberList';
import { GroupSettings } from '../features/groups/components/GroupSettings';
import { PhotoGallery } from '../features/photos/components/PhotoGallery';
import { PhotoUploadModal } from '../features/photos/components/PhotoUploadModal';
import { GroupOrdersTab } from '../features/orders/components/GroupOrdersTab';
import { GroupBooksTab } from '../features/books/components/GroupBooksTab';
import { InviteModal } from '../features/groups/components/InviteModal';
import { KakaoImportModal } from '../features/kakao-import/components/KakaoImportModal';
import { ActivityList } from '../features/activities/components/ActivityList';
import { UploaderRanking } from '../features/photos/components/UploaderRanking';

const TABS = [
  { key: 'photos', label: '사진' },
  { key: 'members', label: '멤버' },
  { key: 'books', label: '포토북' },
  { key: 'orders', label: '주문' },
  { key: 'activity', label: '활동' },
  { key: 'cover', label: '표지투표' },
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
  const { data: faceStatus } = useFaceDetectionStatus(Number(groupId));
  const [activeTab, setActiveTab] = useState('photos');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isKakaoOpen, setIsKakaoOpen] = useState(false);
  const [kakaoToast, setKakaoToast] = useState(null); // { count: number }
  const kakaoToastTimerRef = useRef(null);
  const [shareCopied, setShareCopied] = useState(false);

  const isOwner = me && group && me.id === group.ownerId;

  const handleKakaoImportComplete = (result) => {
    setIsKakaoOpen(false);
    const count = result?.totalPhotos ?? result?.savedPhotos ?? 0;
    setKakaoToast({ count });
    if (kakaoToastTimerRef.current) clearTimeout(kakaoToastTimerRef.current);
    kakaoToastTimerRef.current = setTimeout(() => setKakaoToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (kakaoToastTimerRef.current) clearTimeout(kakaoToastTimerRef.current);
    };
  }, []);

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
            {/* Status badge + transition button */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex px-2.5 py-0.5 bg-brand/25 text-brand text-xs font-medium rounded-full">
                {STATUS_LABELS[group.status] ?? group.status}
              </span>
{faceStatus?.inProgress && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/20 text-blue-200 text-xs font-medium rounded-full">
                  <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse" />
                  얼굴 감지 중 {faceStatus.queue.waiting + faceStatus.queue.active}장
                </span>
              )}
            </div>

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

          {/* Action buttons — desktop: inline top-right */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => setIsInviteOpen(true)}
              className="h-9 px-4 rounded-full bg-brand hover:bg-brand-hover transition-colors text-white text-xs font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              초대
            </button>
            <button type="button" onClick={() => setIsUploadOpen(true)}
              className="h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              업로드
            </button>
            {isOwner && (
              <button type="button" onClick={() => setIsSettingsOpen((v) => !v)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors text-white ${isSettingsOpen ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}
                title="모임 설정">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {!isOwner && (
              <button type="button" onClick={handleLeave} disabled={leaveGroup.isPending}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/30 transition-colors text-white/60 hover:text-red-200 disabled:opacity-50"
                title="모임 나가기">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Action buttons — mobile/tablet: dedicated row below info, full-width primary */}
        <div className="lg:hidden mt-4 flex items-stretch gap-2">
          <button type="button" onClick={() => setIsInviteOpen(true)}
            className="flex-1 h-11 rounded-full bg-brand hover:bg-brand-hover transition-colors text-white text-sm font-semibold flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            초대하기
          </button>
          <button type="button" onClick={() => setIsUploadOpen(true)}
            className="flex-1 h-11 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-semibold flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            업로드
          </button>
          {isOwner && (
            <button type="button" onClick={() => setIsSettingsOpen((v) => !v)}
              className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors text-white flex-shrink-0 ${isSettingsOpen ? 'bg-white/25' : 'bg-white/15 hover:bg-white/25'}`}
              title="모임 설정">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          {!isOwner && (
            <button type="button" onClick={handleLeave} disabled={leaveGroup.isPending}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-white/15 hover:bg-red-500/30 transition-colors text-white/70 hover:text-red-200 disabled:opacity-50 flex-shrink-0"
              title="모임 나가기">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Invite modal */}
      {isInviteOpen && (
        <InviteModal
          inviteCode={group.inviteCode}
          groupName={group.name}
          onClose={() => setIsInviteOpen(false)}
          shareCopied={shareCopied}
          setShareCopied={setShareCopied}
        />
      )}

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
              onClick={() => {
                if (tab.key === 'cover') {
                  navigate(`/groups/${groupId}/cover-voting`);
                } else {
                  setActiveTab(tab.key);
                }
              }}
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
          <div>
            {/* 카톡에서 가져오기 배너 */}
            <button type="button" onClick={() => setIsKakaoOpen(true)}
              className="w-full mb-4 flex items-center gap-3 p-3.5 bg-gradient-to-r from-yellow-50 to-amber-50 border border-amber-200 rounded-2xl hover:from-yellow-100 hover:to-amber-100 transition-colors text-left">
              <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 text-lg">💬</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">카카오톡에서 사진 한 번에 가져오기</p>
                <p className="text-[11px] text-ink-sub mt-0.5">단톡방 대화 내보내기 zip을 올리면 사진이 업로더 이름과 함께 들어와요</p>
              </div>
              <svg className="w-5 h-5 text-ink-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <PhotoGallery
              groupId={Number(groupId)}
              onUploadClick={() => setIsUploadOpen(true)}
            />
          </div>
        )}
        {activeTab === 'members' && (
          <div>
            <MemberList
              groupId={Number(groupId)}
              members={group.members ?? []}
              currentUserId={me?.id}
              ownerId={group.ownerId}
              inviteCode={group.inviteCode}
            />
          </div>
        )}
        {activeTab === 'books' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}/books`)}
                className="text-sm font-medium text-brand hover:underline flex items-center gap-1"
              >
                전체 보기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/30 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-ink flex items-center gap-1">
                  ✨ 개인 포토북 (Personal Book)
                </p>
                <p className="text-sm text-ink/70 mt-1">
                  얼굴 인식으로 당신이 주인공인 포토북을 자동 생성해요
                </p>
              </div>
              <button
                onClick={() => navigate(`/groups/${groupId}/books/personal`)}
                className="bg-brand text-white rounded-xl px-4 py-2 font-semibold whitespace-nowrap hover:opacity-90"
              >
                만들기 →
              </button>
            </div>
            <GroupBooksTab groupId={Number(groupId)} navigate={navigate} />
          </div>
        )}
        {activeTab === 'orders' && (
          <GroupOrdersTab groupId={Number(groupId)} navigate={navigate} />
        )}
        {activeTab === 'activity' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 space-y-5">
              <UploaderRanking groupId={Number(groupId)} limit={5} />
            </div>
            <div className="lg:col-span-2">
              <ActivityList groupId={Number(groupId)} />
            </div>
          </div>
        )}
      </div>

      <PhotoUploadModal
        groupId={Number(groupId)}
        groupName={group.name}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      {isKakaoOpen && (
        <KakaoImportModal
          groupId={Number(groupId)}
          onClose={() => setIsKakaoOpen(false)}
          onImportComplete={handleKakaoImportComplete}
        />
      )}

      {kakaoToast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-ink text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {kakaoToast.count}장 가져왔어요
          </div>
        </div>
      )}
    </div>
  );
}
