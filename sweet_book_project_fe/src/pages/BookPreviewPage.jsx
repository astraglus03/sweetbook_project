import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages, useToggleShare } from '../features/books/hooks/useBooks';

export function BookPreviewPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const numBookId = Number(bookId);
  const { data: book, isLoading } = useBook(numBookId);
  const { data: pages } = useBookPages(numBookId);
  const toggleShare = useToggleShare(numBookId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  const pageList = pages ?? [];
  const currentPage = pageList[currentIndex];

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(pageList.length - 1, i + 1));

  const handleShare = async () => {
    if (!book?.isShared) {
      toggleShare.mutate();
    }
    if (book?.shareCode) {
      const link = `${window.location.origin}/shared/${book.shareCode}`;
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
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-sm text-white/60">포토북을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Top bar */}
      <div className="h-[52px] flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          포토북 미리보기
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="h-8 px-3.5 text-xs font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-colors"
          >
            {shareCopied ? '링크 복사됨!' : '공유'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/books/${bookId}/order`)}
            className="h-8 px-4 text-xs font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors"
          >
            주문하기
          </button>
        </div>
      </div>

      {/* Page viewer */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 relative">
        {/* Prev button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="absolute left-4 lg:left-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Spread view */}
        <div className="flex gap-1 max-w-4xl w-full justify-center">
          {currentPage ? (
            <div className="bg-white shadow-2xl rounded overflow-hidden" style={{ maxWidth: '480px', width: '100%' }}>
              {currentPage.thumbnailUrl || currentPage.mediumUrl ? (
                <img
                  src={currentPage.mediumUrl || currentPage.thumbnailUrl}
                  alt={`페이지 ${currentPage.pageNumber}`}
                  className="w-full aspect-square object-contain bg-white"
                />
              ) : (
                <div className="w-full aspect-square bg-white flex flex-col items-center justify-center p-8">
                  {currentPage.chapterTitle && (
                    <h2 className="font-display text-2xl font-bold text-ink mb-3">
                      {currentPage.chapterTitle}
                    </h2>
                  )}
                  {currentPage.caption && (
                    <p className="text-sm text-ink-sub leading-relaxed text-center whitespace-pre-line">
                      {currentPage.caption}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-white/40">
              <p className="text-sm">페이지가 없습니다</p>
            </div>
          )}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex >= pageList.length - 1}
          className="absolute right-4 lg:right-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Page indicator */}
      <div className="h-10 flex items-center justify-center text-sm text-white/50 flex-shrink-0">
        {pageList.length > 0
          ? `${currentIndex + 1} / ${pageList.length} 페이지`
          : '페이지 없음'}
      </div>
    </div>
  );
}
