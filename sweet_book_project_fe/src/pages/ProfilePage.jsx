import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe, useLogout } from '../features/auth/hooks/useAuth';
import { useMyGroups } from '../features/groups/hooks/useGroups';
import { useThemeStore } from '../stores/theme.store';
import { api } from '../lib/axios';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const TABS = [
  { key: 'profile', label: '프로필', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { key: 'security', label: '보안', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { key: 'notifications', label: '알림 설정', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { key: 'preferences', label: '표시 & 연동', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading, isError: userError, refetch } = useMe();
  const logout = useLogout();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const fileRef = useRef(null);

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // Notification toggles
  const [notifSettings, setNotifSettings] = useState({
    emailNotif: true,
    uploadReminder: true,
    voteAlert: true,
    marketingEmail: false,
  });

  // Theme & groups
  const { theme, setTheme } = useThemeStore();
  const { data: myGroups } = useMyGroups();
  const groupsList = myGroups?.groups ?? [];

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.patch('/users/me/profile', { name });
      await refetch();
      setSaveMsg({ type: 'success', text: '저장되었습니다' });
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.response?.data?.error?.message || '저장에 실패했습니다' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refetch();
    } catch {
      setSaveMsg({ type: 'error', text: '아바타 업로드에 실패했습니다' });
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: '새 비밀번호가 일치하지 않습니다' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwMsg({ type: 'success', text: '비밀번호가 변경되었습니다' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error?.message || '비밀번호 변경에 실패했습니다' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    });
  };

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawPending, setWithdrawPending] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const handleWithdraw = async () => {
    setWithdrawPending(true);
    setWithdrawError('');
    try {
      await api.delete('/users/me');
      navigate('/login', { replace: true });
    } catch (err) {
      setWithdrawError(err.response?.data?.error?.message || '탈퇴에 실패했습니다');
    } finally {
      setWithdrawPending(false);
    }
  };

  if (userLoading) {
    return (
      <div className="px-4 lg:px-10 lg:max-w-6xl lg:mx-auto py-8">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-[240px] flex-shrink-0">
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-warm-bg animate-pulse" />
              ))}
            </div>
          </aside>
          <div className="flex-1 max-w-[480px] space-y-5">
            <div className="h-7 w-40 rounded-lg bg-warm-bg animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="w-[72px] h-[72px] rounded-full bg-warm-bg animate-pulse flex-shrink-0" />
              <div className="h-8 w-24 rounded-lg bg-warm-bg animate-pulse" />
            </div>
            <div className="h-[42px] rounded-[10px] bg-warm-bg animate-pulse" />
            <div className="h-[42px] rounded-[10px] bg-warm-bg animate-pulse" />
            <div className="h-[42px] w-24 rounded-full bg-warm-bg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 px-4">
        <p className="text-sm text-ink-sub">프로필을 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-full hover:bg-brand-hover transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="px-4 lg:px-10 lg:max-w-6xl lg:mx-auto py-8">
      <div className="flex gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-[240px] flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-brand/10 text-brand font-semibold'
                    : 'text-ink-sub hover:bg-warm-bg'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-warm-border space-y-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
              <button
                type="button"
                onClick={() => setWithdrawOpen(true)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
                회원 탈퇴
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Mobile tabs */}
          <div className="flex gap-2 overflow-x-auto lg:hidden pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-brand text-white'
                    : 'bg-white border border-warm-border text-ink-sub'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="max-w-[480px]">
              <h2 className="text-[22px] font-bold text-ink mb-6">프로필 설정</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-[72px] h-[72px] rounded-full bg-brand flex-shrink-0 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                      {user.name?.[0]}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="px-3.5 py-1.5 text-sm border border-warm-border rounded-lg hover:bg-warm-bg transition-colors"
                  >
                    사진 변경
                  </button>
                  <p className="text-xs text-ink-muted mt-1.5">JPG, PNG (최대 5MB)</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label htmlFor="pf-name" className="block text-[13px] font-medium text-ink mb-1.5">이름</label>
                <input
                  id="pf-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                />
              </div>

              {/* Email (read-only) */}
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-ink mb-1.5">이메일</label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="w-full h-[42px] px-3.5 bg-warm-bg border border-warm-border rounded-[10px] text-sm text-ink-muted cursor-not-allowed"
                />
              </div>

              {/* Save */}
              {saveMsg && (
                <p className={`text-sm mb-3 ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {saveMsg.text}
                </p>
              )}
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving || name === user.name}
                className="h-[42px] px-6 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <div className="max-w-[480px]">
              <h2 className="text-[22px] font-bold text-ink mb-6">비밀번호 변경</h2>
              {user.provider !== 'local' && !user.passwordHash ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  소셜 로그인({user.provider === 'google' ? 'Google' : '카카오'}) 계정은 비밀번호가 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="pw-current" className="block text-[13px] font-medium text-ink mb-1.5">현재 비밀번호</label>
                    <input
                      id="pw-current"
                      type="password"
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="pw-new" className="block text-[13px] font-medium text-ink mb-1.5">새 비밀번호</label>
                    <input
                      id="pw-new"
                      type="password"
                      minLength={8}
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                      className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                      placeholder="8자 이상"
                    />
                  </div>
                  <div>
                    <label htmlFor="pw-confirm" className="block text-[13px] font-medium text-ink mb-1.5">새 비밀번호 확인</label>
                    <input
                      id="pw-confirm"
                      type="password"
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                    />
                  </div>
                  {pwMsg && (
                    <p className={`text-sm ${pwMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                      {pwMsg.text}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={pwSaving || !pwForm.currentPassword || pwForm.newPassword.length < 8}
                    className="h-[42px] px-6 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-50"
                  >
                    {pwSaving ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preferences tab — theme, face anchor, oauth unlink */}
          {activeTab === 'preferences' && (
            <div className="max-w-[560px] space-y-8">
              <div>
                <h2 className="text-[22px] font-bold text-ink mb-4">표시 모드</h2>
                <div className="flex gap-2">
                  {[
                    { key: 'light', label: '☀️ 라이트' },
                    { key: 'dark', label: '🌙 다크' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTheme(t.key)}
                      className={`flex-1 h-11 rounded-full text-sm font-semibold transition-colors ${
                        theme === t.key
                          ? 'bg-brand text-white'
                          : 'bg-white border border-warm-border text-ink-sub hover:bg-warm-bg'
                      }`}
                      aria-pressed={theme === t.key}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-ink-muted mt-2">
                  기기별로 저장됩니다. 시스템 설정에 맞추려면 브라우저 설정을 참고하세요.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-bold text-ink mb-2">내 얼굴 앵커</h2>
                <p className="text-xs text-ink-sub mb-3">
                  얼굴 사진을 등록하면 개인 포토북 자동 생성 시 본인이 찍힌 사진을 더 정확하게 찾아냅니다. 모임별로 등록합니다.
                </p>
                {groupsList.length === 0 ? (
                  <p className="text-xs text-ink-muted py-4 text-center bg-warm-bg rounded-lg">
                    참여 중인 모임이 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groupsList.slice(0, 5).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => navigate(`/groups/${g.id}/face-anchor`)}
                        className="w-full flex items-center justify-between p-3 bg-white border border-warm-border rounded-lg hover:border-brand hover:bg-brand/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-brand/10 flex-shrink-0 overflow-hidden flex items-center justify-center text-brand text-sm font-bold">
                            {g.coverImage ? (
                              <img src={g.coverImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              g.name?.[0] ?? '?'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{g.name}</p>
                            <p className="text-[11px] text-ink-muted">등록하러 가기 →</p>
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-ink-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Notifications tab */}
          {activeTab === 'notifications' && (
            <div className="max-w-[480px]">
              <h2 className="text-[22px] font-bold text-ink mb-6">알림 설정</h2>
              <div className="divide-y divide-warm-border">
                {[
                  { key: 'emailNotif', label: '이메일 알림', desc: '전체 알림을 이메일로 받습니다' },
                  { key: 'uploadReminder', label: '업로드 독려 알림', desc: '마감일 전 사진 업로드 독려 알림' },
                  { key: 'voteAlert', label: '투표 알림', desc: '표지 투표 시작/마감 알림' },
                  { key: 'marketingEmail', label: '마케팅 이메일', desc: '이벤트, 할인 등 프로모션 정보' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4">
                    <div>
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifSettings((s) => ({ ...s, [item.key]: !s[item.key] }))}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        notifSettings[item.key] ? 'bg-brand' : 'bg-warm-tag'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          notifSettings[item.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile: logout + withdraw */}
          <div className="lg:hidden pt-6 border-t border-warm-border space-y-3">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-11 text-sm font-medium text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
            >
              로그아웃
            </button>
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              className="w-full text-sm text-red-400 hover:underline py-2"
            >
              회원 탈퇴
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={withdrawOpen}
        title="정말 탈퇴하시겠습니까?"
        description={`이 작업은 되돌릴 수 없습니다. 참여 중인 모임/포토북은 삭제되지 않지만 프로필은 익명 처리됩니다.${withdrawError ? `\n\n${withdrawError}` : ''}`}
        confirmLabel="탈퇴"
        cancelLabel="취소"
        danger
        isPending={withdrawPending}
        onConfirm={handleWithdraw}
        onClose={() => setWithdrawOpen(false)}
      />
    </div>
  );
}
