export function InviteModal({ inviteCode, groupName, onClose, shareCopied, setShareCopied }) {
  const inviteLink = inviteCode ? `${window.location.origin}/join/${inviteCode}` : '';

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: `${groupName} 모임 초대`,
        text: `${groupName} 모임에 참여하세요!`,
        url: inviteLink,
      });
    } catch {
      // 사용자가 공유를 취소
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-warm-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">멤버 초대</h2>
            <p className="text-xs text-ink-sub mt-1">링크를 복사하거나 공유해서 멤버를 초대하세요</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg text-ink-sub">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-ink-sub mb-1.5">초대 링크</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 h-11 px-3.5 rounded-[10px] border border-warm-border bg-warm-bg/40 text-sm font-mono text-ink-sub focus:outline-none"
                onFocus={(e) => e.target.select()}
              />
              <button type="button" onClick={handleCopy}
                className={`h-11 px-4 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  shareCopied ? 'bg-green-500 text-white' : 'bg-ink text-white hover:bg-black'
                }`}>
                {shareCopied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    복사됨
                  </>
                ) : '복사'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-ink-sub mb-1.5">초대 코드</p>
            <p className="text-2xl font-bold text-brand tracking-widest font-mono">{inviteCode ?? '-'}</p>
          </div>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button type="button" onClick={handleNativeShare}
              className="w-full h-11 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              카카오톡 · 메시지로 공유
            </button>
          )}

          <p className="text-[11px] text-ink-muted text-center pt-2">
            초대 링크로 입장한 사람은 자동으로 모임에 합류됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
