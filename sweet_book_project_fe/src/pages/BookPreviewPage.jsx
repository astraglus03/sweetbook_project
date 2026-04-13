import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages, useToggleShare } from '../features/books/hooks/useBooks';
import { BookPreviewModal } from '../features/books/components/BookPreviewModal';

export function BookPreviewPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const numBookId = Number(bookId);
  const { data: book, isLoading } = useBook(numBookId);
  const { data: pages } = useBookPages(numBookId);
  const toggleShare = useToggleShare(numBookId);
  const [shareCopied, setShareCopied] = useState(false);

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
    <>
      <BookPreviewModal
        book={book}
        pages={pages}
        coverTemplateUid={book.coverTemplateUid}
        coverParams={book.coverParams}
        onClose={() => navigate(-1)}
      />
      {/* Floating actions (공유/주문) - Modal 우하단 */}
      <div className="fixed bottom-16 right-4 lg:right-8 z-[60] flex items-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="h-9 px-4 text-xs font-medium text-white border border-white/20 bg-white/5 backdrop-blur rounded-full hover:bg-white/10 transition-colors"
        >
          {shareCopied ? '링크 복사됨!' : '공유'}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/books/${bookId}/order`)}
          className="h-9 px-5 text-xs font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors shadow-lg"
        >
          주문하기
        </button>
      </div>
    </>
  );
}
