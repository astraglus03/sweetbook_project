import { useMemo, useState } from 'react';
import { useSaveKakaoMappings } from '../hooks/useKakaoImport';

// result: { totalPhotos, savedPhotos, matchedPhotos, unmatchedNames: [{kakaoName, photoCount, suggestions}] }
// members: group.members (userName/userId 포함)
export function KakaoMappingModal({ groupId, result, members, onClose, onDone }) {
  const unmatched = result?.unmatchedNames ?? [];
  const saveMappings = useSaveKakaoMappings(groupId);

  const [selections, setSelections] = useState(() => {
    const initial = {};
    for (const item of unmatched) {
      // 첫 번째 제안을 기본 선택
      initial[item.kakaoName] = item.suggestions?.[0]?.userId ?? '';
    }
    return initial;
  });

  const memberOptions = useMemo(
    () => (members ?? []).map((m) => ({ userId: m.userId, name: m.userName })),
    [members],
  );

  const handleChange = (kakaoName, value) => {
    setSelections((prev) => ({
      ...prev,
      [kakaoName]: value === '' ? '' : Number(value),
    }));
  };

  const handleSave = () => {
    const mappings = Object.entries(selections).map(([kakaoName, userId]) => ({
      kakaoName,
      userId: userId === '' ? null : userId,
    }));
    saveMappings.mutate(mappings, {
      onSuccess: (res) => {
        onDone?.(res);
        onClose();
      },
    });
  };

  const handleSkip = () => {
    onClose();
  };

  const hasUnmatched = unmatched.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-warm-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">가져오기 완료</h2>
            <p className="text-xs text-ink-sub mt-1">
              총 <b className="text-ink">{result?.totalPhotos ?? 0}장</b> 가져옴 ·
              자동 매칭 <b className="text-ink">{result?.matchedPhotos ?? 0}장</b>
              {hasUnmatched && ` · 수동 매칭 필요 ${unmatched.reduce((s, u) => s + u.photoCount, 0)}장`}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg text-ink-sub flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {hasUnmatched ? (
          <>
            <div className="px-6 pt-4 pb-2">
              <p className="text-[12px] text-ink-sub leading-relaxed">
                카톡 닉네임과 모임 멤버를 연결해주세요. 다음번 import부터 자동으로 적용돼요.
              </p>
            </div>
            <ul className="flex-1 overflow-y-auto px-6 pb-2 space-y-2">
              {unmatched.map((item) => (
                <li key={item.kakaoName} className="bg-warm-bg/40 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">"{item.kakaoName}"</p>
                    <p className="text-[11px] text-ink-muted">{item.photoCount}장</p>
                  </div>
                  <span className="text-ink-muted text-sm">→</span>
                  <select
                    value={selections[item.kakaoName] ?? ''}
                    onChange={(e) => handleChange(item.kakaoName, e.target.value)}
                    className="h-10 min-w-[140px] px-3 rounded-[10px] border border-warm-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="">매칭 안함</option>
                    {memberOptions.map((opt) => (
                      <option key={opt.userId} value={opt.userId}>{opt.name}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>

            <div className="p-6 pt-4 border-t border-warm-border flex gap-2">
              <button type="button" onClick={handleSkip}
                className="flex-1 h-11 rounded-full border border-warm-border text-sm font-medium text-ink-sub hover:bg-warm-bg transition-colors">
                나중에 하기
              </button>
              <button type="button" onClick={handleSave}
                disabled={saveMappings.isPending}
                className="flex-1 h-11 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors disabled:opacity-50">
                {saveMappings.isPending ? '저장 중…' : '매칭 저장'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-ink mb-1">모든 사진이 자동으로 매칭됐어요!</p>
              <p className="text-xs text-ink-muted">사진 갤러리에서 확인하세요</p>
            </div>
            <div className="p-6 pt-0">
              <button type="button" onClick={onClose}
                className="w-full h-11 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors">
                확인
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
