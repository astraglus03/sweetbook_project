import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBook, useBookPages } from '../features/books/hooks/useBooks';
import { useExcludePhoto } from '../features/books/personal/hooks/usePersonalBook';

export function PersonalBookReviewPage() {
  const { groupId, bookId } = useParams();
  const numGroupId = Number(groupId);
  const numBookId = Number(bookId);
  const navigate = useNavigate();

  const { data: book, isLoading } = useBook(numBookId);
  const { data: pages } = useBookPages(numBookId);
  const excludeMut = useExcludePhoto(numGroupId, numBookId);

  const [removingId, setRemovingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleExclude = async (photoId) => {
    if (!confirm('이 사진을 내 개인 포토북에서 제외할까요?')) return;
    setRemovingId(photoId);
    try {
      const res = await excludeMut.mutateAsync(photoId);
      const data = res?.data ?? res;
      if (data?.thresholdAdjusted) {
        setFeedback({
          type: 'success',
          message: `제외 완료 — 정확도 자동 향상 (임계값 ${data.threshold.toFixed(2)})`,
        });
      } else {
        setFeedback({ type: 'success', message: '제외됐어요' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.error?.message ?? '제외 실패',
      });
    } finally {
      setRemovingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!book || book.bookType !== 'PERSONAL') {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center max-w-md">
          <p className="text-ink mb-4">개인 포토북이 아니에요</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-brand text-white rounded-xl px-5 py-2 font-semibold"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const photoPages = (pages ?? []).filter((p) => p.photoId && p.photo);

  return (
    <div className="min-h-screen bg-warm-bg">
      <div className="bg-ink text-white px-6 lg:px-20 py-8 lg:py-10">
        <button
          onClick={() => navigate(-1)}
          className="text-white/60 hover:text-white text-sm mb-4"
        >
          ‹ 돌아가기
        </button>
        <h1
          className="text-2xl lg:text-3xl font-bold"
          style={{ fontFamily: 'Playfair Display' }}
        >
          ✨ {book.title}
        </h1>
        <p className="text-white/70 text-sm mt-2">
          얼굴 인식으로 자동 매칭된 {photoPages.length}장의 사진이에요
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-4">
        <div className="bg-[#FFF5F0] border border-brand/30 rounded-xl p-4 text-sm text-ink/80">
          <p className="font-semibold text-ink mb-1">
            🎯 당신으로 인식된 사진 검수
          </p>
          <p>
            잘못 매칭된 사진이 있으면 <strong>✕ 버튼</strong>으로 제외할 수
            있어요. 모두 확인한 뒤 <strong>편집하기</strong>에서 페이지 순서나
            레이아웃을 바꿀 수 있어요.
          </p>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-lg text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photoPages.map((page) => {
            const photo = page.photo;
            const thumb =
              photo.thumbnailUrl ?? photo.mediumUrl ?? photo.originalUrl;
            const isRemoving = removingId === photo.id;
            return (
              <div
                key={page.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-[#FAF7F2] group"
              >
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <button
                  onClick={() => handleExclude(photo.id)}
                  disabled={isRemoving}
                  className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-500 text-white rounded-full w-7 h-7 text-xs flex items-center justify-center transition-colors disabled:opacity-50"
                  title="이 사람 나 아니에요"
                >
                  {isRemoving ? '...' : '✕'}
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
                  <span className="text-white text-xs">#{page.pageNumber}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 sticky bottom-0 bg-warm-bg/80 backdrop-blur py-3 -mx-4 lg:-mx-8 px-4 lg:px-8 border-t border-[#E5E0D8]">
          <button
            onClick={() =>
              navigate(`/groups/${numGroupId}/books/personal`)
            }
            className="flex-1 border border-[#E5E0D8] rounded-xl py-3 font-semibold text-ink hover:bg-white"
          >
            목록으로
          </button>
          <button
            onClick={() => navigate(`/books/${numBookId}/editor`)}
            className="flex-1 bg-brand text-white rounded-xl py-3 font-semibold hover:opacity-90"
          >
            편집하기 →
          </button>
        </div>
      </div>
    </div>
  );
}
