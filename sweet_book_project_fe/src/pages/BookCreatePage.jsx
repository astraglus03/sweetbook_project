import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCreateBook, useThemes, useCoverTemplates } from '../features/books/hooks/useBooks';
import { useCoverCandidate } from '../features/cover-voting/hooks/useCoverVoting';
import { CoverPreview } from '../features/cover-voting/components/CoverPreview';
import { usePhotos } from '../features/photos/hooks/usePhotos';

const THEME_LABELS = {
  '구글포토북C': { name: '심플 포토', desc: '사진 1장 + 날짜 라벨' },
  '구글포토북B': { name: '갤러리 B', desc: '날짜별 사진 갤러리' },
  '구글포토북A': { name: '갤러리 A', desc: '월별 사진 갤러리' },
  '일기장B': { name: '다이어리 B', desc: '사진 + 날짜 + 제목 + 일기' },
  '일기장A': { name: '다이어리 A', desc: '사진 + 월/일 + 일기' },
};

const SPEC_NAMES = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

export function BookCreatePage() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gid = Number(groupId);

  const coverCandidateId = searchParams.get('coverCandidateId');
  const candidateIdNum = coverCandidateId ? Number(coverCandidateId) : null;
  const specFromQuery = searchParams.get('spec');

  const { data: candidate, isLoading: candidateLoading } = useCoverCandidate(
    gid,
    candidateIdNum,
  );
  const { data: photoData } = usePhotos(gid, { limit: 200 });
  const photos = photoData?.photos ?? [];

  const specUid = candidate?.bookSpecUid ?? specFromQuery;
  const lockedTheme = candidate?.theme ?? null;

  const createBook = useCreateBook(gid);
  const { data: themes, isLoading: themesLoading } = useThemes(specUid);
  const { data: coverTemplates } = useCoverTemplates(specUid);
  const candidateTemplate = candidate && Array.isArray(coverTemplates)
    ? coverTemplates.find((t) => t.templateUid === candidate.templateUid) ?? null
    : null;

  const [title, setTitle] = useState('');
  const [manualTheme, setManualTheme] = useState(null);
  const [error, setError] = useState(null);

  const selectedTheme = lockedTheme ?? manualTheme;

  const handleCreate = () => {
    if (!title.trim() || !specUid || !selectedTheme) return;
    setError(null);
    const payload = {
      title: title.trim(),
      bookSpecUid: specUid,
      theme: selectedTheme,
    };
    if (candidateIdNum) payload.coverCandidateId = candidateIdNum;

    createBook.mutate(payload, {
      onSuccess: (book) => {
        navigate(`/books/${book.id}/editor`);
      },
      onError: (err) => {
        setError(err.response?.data?.error?.message || '포토북 생성에 실패했습니다');
      },
    });
  };

  const isPrefillLoading = candidateIdNum && candidateLoading;

  return (
    <div className="flex items-start justify-center px-4 py-10 lg:py-16">
      <div className="w-full max-w-[560px] bg-white rounded-2xl border border-warm-border p-8 lg:p-10">
        <div className="mb-7">
          <h1 className="text-[22px] font-bold text-ink">포토북 만들기</h1>
          <p className="text-sm text-ink-sub mt-1.5">
            {candidate
              ? '확정된 표지로 시작합니다. 제목만 입력하면 바로 편집할 수 있어요'
              : '제목과 테마를 선택하고 편집을 시작하세요'}
          </p>
        </div>

        {isPrefillLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Cover preview (when confirmed) */}
            {candidate && (
              <div className="bg-warm-bg rounded-xl p-4">
                <p className="text-xs text-ink-muted mb-2">확정된 표지</p>
                <div className="max-w-[200px] mx-auto">
                  <CoverPreview
                    template={candidateTemplate}
                    templateUid={candidate.templateUid}
                    params={candidate.params ?? {}}
                    photos={photos}
                  />
                </div>
                {candidate.templateName && (
                  <p className="text-[11px] text-ink/40 mt-2 text-center">
                    {candidate.templateName}
                  </p>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="book-title" className="block text-[13px] font-medium text-ink mb-1.5">
                포토북 제목
              </label>
              <input
                id="book-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="예: 2026 동문회 추억"
                className="w-full h-12 px-3.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 transition"
              />
            </div>

            {/* Spec info */}
            <div className="bg-warm-bg rounded-xl p-4">
              <p className="text-xs text-ink-muted mb-1">선택한 판형</p>
              <p className="text-sm font-medium text-ink">{SPEC_NAMES[specUid] ?? specUid}</p>
            </div>

            {/* Theme selection */}
            <div>
              <label className="block text-[13px] font-medium text-ink mb-2">
                테마 {lockedTheme && <span className="text-ink-muted text-[11px] font-normal">(표지 확정으로 자동 선택됨)</span>}
              </label>
              {themesLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(themes ?? []).map((t) => {
                    const label = THEME_LABELS[t.theme];
                    const isSelected = selectedTheme === t.theme;
                    const isLocked = !!lockedTheme && lockedTheme !== t.theme;
                    return (
                      <button
                        key={t.theme}
                        type="button"
                        disabled={isLocked}
                        onClick={() => !isLocked && setManualTheme(t.theme)}
                        className={`rounded-xl border-2 p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-brand bg-brand/5'
                            : isLocked
                            ? 'border-warm-border opacity-40 cursor-not-allowed'
                            : 'border-warm-border hover:border-brand/40'
                        }`}
                      >
                        {t.thumbnail && (
                          <img
                            src={t.thumbnail}
                            alt={t.theme}
                            className="w-full aspect-[4/3] object-cover rounded-lg mb-2 bg-warm-bg"
                          />
                        )}
                        <p className="text-sm font-semibold text-ink">
                          {label?.name ?? t.theme}
                        </p>
                        <p className="text-[11px] text-ink-sub mt-0.5">
                          {label?.desc ?? ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 h-[42px] text-sm font-medium text-ink-sub border border-warm-border rounded-full hover:bg-warm-bg transition-colors"
              >
                뒤로
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!title.trim() || !selectedTheme || !specUid || createBook.isPending}
                className="flex-1 h-[42px] text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {createBook.isPending ? '생성 중...' : '편집 시작'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
