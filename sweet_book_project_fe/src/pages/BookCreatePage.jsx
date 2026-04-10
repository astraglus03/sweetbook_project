import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCreateBook, useThemes } from '../features/books/hooks/useBooks';

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
  const specUid = searchParams.get('spec');
  const createBook = useCreateBook(Number(groupId));
  const { data: themes, isLoading: themesLoading } = useThemes(specUid);

  const [title, setTitle] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [error, setError] = useState(null);

  const handleCreate = () => {
    if (!title.trim() || !specUid || !selectedTheme) return;
    setError(null);
    createBook.mutate(
      { title: title.trim(), bookSpecUid: specUid, theme: selectedTheme },
      {
        onSuccess: (book) => {
          navigate(`/books/${book.id}/editor`);
        },
        onError: (err) => {
          setError(err.response?.data?.error?.message || '포토북 생성에 실패했습니다');
        },
      },
    );
  };

  return (
    <div className="flex items-start justify-center px-4 py-10 lg:py-16">
      <div className="w-full max-w-[520px] bg-white rounded-2xl border border-warm-border p-8 lg:p-10">
        <div className="mb-7">
          <h1 className="text-[22px] font-bold text-ink">포토북 만들기</h1>
          <p className="text-sm text-ink-sub mt-1.5">
            제목과 테마를 선택하고 편집을 시작하세요
          </p>
        </div>

        <div className="space-y-5">
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
              테마 선택
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
                  return (
                    <button
                      key={t.theme}
                      type="button"
                      onClick={() => setSelectedTheme(t.theme)}
                      className={`rounded-xl border-2 p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-brand bg-brand/5'
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
              disabled={!title.trim() || !selectedTheme || createBook.isPending}
              className="flex-1 h-[42px] text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              {createBook.isPending ? '생성 중...' : '편집 시작'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
