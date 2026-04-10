import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCreateBook } from '../features/books/hooks/useBooks';

export function BookCreatePage() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const specUid = searchParams.get('spec');
  const createBook = useCreateBook(Number(groupId));

  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);

  const handleCreate = () => {
    if (!title.trim() || !specUid) return;
    setError(null);
    createBook.mutate(
      { title: title.trim(), bookSpecUid: specUid },
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
      <div className="w-full max-w-[480px] bg-white rounded-2xl border border-warm-border p-8 lg:p-10">
        <div className="mb-7">
          <h1 className="text-[22px] font-bold text-ink">포토북 만들기</h1>
          <p className="text-sm text-ink-sub mt-1.5">
            포토북 제목을 입력하고 편집을 시작하세요
          </p>
        </div>

        <div className="space-y-4">
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
              className="w-full h-[42px] px-3.5 bg-white border border-warm-border rounded-[10px] text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
            />
          </div>

          <div className="bg-warm-bg rounded-xl p-4">
            <p className="text-xs text-ink-muted mb-1">선택한 판형</p>
            <p className="text-sm font-medium text-ink">{specUid}</p>
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
              disabled={!title.trim() || createBook.isPending}
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
