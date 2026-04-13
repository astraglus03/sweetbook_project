import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupDetail } from '../features/groups/hooks/useGroups';
import { useGroupBooks, useDeleteBook, useBook, useBookPages } from '../features/books/hooks/useBooks';
import { useMe } from '../features/auth/hooks/useAuth';
import { SPEC_LABEL } from '../features/books/lib/bookLabels';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BookPreviewModal } from '../features/books/components/BookPreviewModal';

const STATUS_INFO = {
  DRAFT: { label: '편집 중', cls: 'bg-gray-100 text-gray-700' },
  PROCESSING: { label: 'PDF 변환 중', cls: 'bg-blue-50 text-blue-700' },
  READY: { label: '결제 대기', cls: 'bg-brand/10 text-brand' },
  ORDERED: { label: '주문 완료', cls: 'bg-green-50 text-green-700' },
  COMPLETED: { label: '배송 완료', cls: 'bg-green-50 text-green-700' },
};

const BOOK_TYPE_LABEL = {
  SHARED: '단체',
  PERSONAL: '개인',
};

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'SHARED', label: '단체 포토북' },
  { key: 'PERSONAL', label: '개인 포토북' },
];

function BookCoverThumb({ book }) {
  const initial = book.title?.[0] ?? '?';
  const isPersonal = book.bookType === 'PERSONAL';
  return (
    <div className={`w-full aspect-[3/4] rounded-xl overflow-hidden flex items-center justify-center border border-warm-border ${isPersonal ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-gradient-to-br from-brand/15 to-brand/5'}`}>
      {book.coverThumbnailUrl ? (
        <img src={book.coverThumbnailUrl} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="font-display text-3xl font-bold" style={{ color: isPersonal ? '#6366f1' : '#D4916E' }}>
          {initial}
        </span>
      )}
    </div>
  );
}

function BookCard({ book, navigate, onDelete, onPreview }) {
  const info = STATUS_INFO[book.status] ?? { label: book.status, cls: 'bg-gray-100 text-gray-600' };
  const specLabel = SPEC_LABEL[book.bookSpecUid] ?? book.bookSpecUid;
  const isPersonal = book.bookType === 'PERSONAL';
  const canDelete = book.status === 'DRAFT' || book.status === 'FAILED';

  const handleClick = () => {
    if (book.status === 'DRAFT') {
      navigate(`/books/${book.id}/editor`);
    } else if (book.status === 'PROCESSING') {
      return;
    } else {
      onPreview?.(book);
    }
  };

  return (
    <div
      role={book.status !== 'PROCESSING' ? 'button' : undefined}
      tabIndex={book.status !== 'PROCESSING' ? 0 : undefined}
      onClick={book.status !== 'PROCESSING' ? handleClick : undefined}
      onKeyDown={(e) => e.key === 'Enter' && book.status !== 'PROCESSING' && handleClick()}
      className={`bg-white rounded-2xl border border-warm-border overflow-hidden flex flex-col ${book.status !== 'PROCESSING' ? 'cursor-pointer hover:shadow-md hover:border-brand/30 transition-all' : ''}`}
    >
      {/* Cover */}
      <div className="p-3 pb-2">
        <BookCoverThumb book={book} />
      </div>

      {/* Info */}
      <div className="px-3 pb-3 flex flex-col flex-1">
        {/* Type + status row */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {book.bookType && (
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${isPersonal ? 'bg-indigo-50 text-indigo-600' : 'bg-brand/10 text-brand'}`}>
              {BOOK_TYPE_LABEL[book.bookType] ?? book.bookType}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${info.cls}`}>
            {info.label}
          </span>
        </div>

        <h3 className="text-[14px] font-bold text-ink truncate mb-0.5">{book.title}</h3>

        <p className="text-[11px] text-ink-muted truncate mb-1">
          {specLabel && `${specLabel} · `}{book.pageCount}페이지
        </p>

        {book.creatorName && (
          <p className="text-[11px] text-ink-muted truncate">
            {book.creatorName}
          </p>
        )}

        {book.createdAt && (
          <p className="text-[11px] text-ink-muted mt-0.5">
            {new Date(book.createdAt).toLocaleDateString('ko-KR')}
          </p>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="mt-2.5 flex gap-1.5">
          {book.status === 'DRAFT' && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate(`/books/${book.id}/editor`); }}
                className="flex-1 h-8 text-[12px] font-semibold bg-brand text-white rounded-full hover:bg-brand-hover transition-colors"
              >
                이어서 편집
              </button>
            </>
          )}
          {book.status === 'PROCESSING' && (
            <div className="flex-1 h-8 flex items-center justify-center gap-1.5 bg-warm-bg rounded-full border border-warm-border">
              <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-brand font-medium">변환 중</span>
            </div>
          )}
          {book.status === 'READY' && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onPreview?.(book); }}
                className="flex-1 h-8 text-[12px] font-medium bg-warm-bg border border-warm-border text-ink rounded-full hover:bg-warm-border transition-colors"
              >
                미리보기
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate(`/books/${book.id}/order`); }}
                className="flex-1 h-8 text-[12px] font-bold bg-brand text-white rounded-full hover:bg-brand-hover transition-colors"
              >
                주문하기
              </button>
            </>
          )}
          {(book.status === 'ORDERED' || book.status === 'COMPLETED') && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/books/${book.id}/order`); }}
              className="flex-1 h-8 text-[12px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full hover:bg-green-100 transition-colors"
            >
              주문 현황
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(book);
              }}
              aria-label="포토북 삭제"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-warm-border text-ink-muted hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V4a2 2 0 012-2h4a2 2 0 012 2v3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookListPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { data: group, isLoading: groupLoading } = useGroupDetail(Number(groupId));
  const { data: books, isLoading: booksLoading, isError } = useGroupBooks(Number(groupId));
  const { data: me } = useMe();
  const deleteBook = useDeleteBook(Number(groupId));
  const [bookToDelete, setBookToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [previewBookId, setPreviewBookId] = useState(null);
  const { data: previewBook } = useBook(previewBookId);
  const { data: previewPages } = useBookPages(previewBookId);

  const handleRequestDelete = (book) => {
    setDeleteError('');
    setBookToDelete(book);
  };
  const handleConfirmDelete = () => {
    if (!bookToDelete) return;
    deleteBook.mutate(bookToDelete.id, {
      onSuccess: () => setBookToDelete(null),
      onError: (err) => {
        setDeleteError(err?.response?.data?.error?.message || '삭제에 실패했습니다');
      },
    });
  };

  const [activeFilter, setActiveFilter] = useState('all');

  const isOwner = me && group && me.id === group.ownerId;
  const isLoading = groupLoading || booksLoading;

  const bookList = books ?? [];
  const filteredBooks = activeFilter === 'all'
    ? bookList
    : bookList.filter((b) => b.bookType === activeFilter);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-bg">
        <div className="animate-pulse px-4 lg:px-10 py-6 max-w-5xl mx-auto">
          <div className="h-5 w-32 bg-warm-border rounded mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-warm-border rounded-2xl aspect-[3/5]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-warm-bg">
        <div className="px-4 text-center py-20">
          <p className="text-sm text-red-500 mb-4">포토북을 불러오지 못했습니다</p>
          <button
            type="button"
            onClick={() => navigate(`/groups/${groupId}`)}
            className="text-sm text-brand hover:underline"
          >
            모임으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-bg pb-28 lg:pb-10">

      {/* Page header */}
      <div className="bg-white border-b border-warm-border px-4 lg:px-10 py-4">
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(`/groups/${groupId}`)}
            className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {group?.name ?? '모임'}
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-ink">포토북</h1>
              <p className="text-sm text-ink-muted mt-0.5">
                {bookList.length > 0 ? `총 ${bookList.length}권` : '아직 포토북이 없어요'}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-0 mt-3 -mb-4 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`pb-3 pt-2 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeFilter === f.key
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-muted hover:text-ink-sub'
                }`}
              >
                {f.label}
                {f.key !== 'all' && (
                  <span className="ml-1.5 text-[11px] text-ink-muted font-normal">
                    {bookList.filter((b) => b.bookType === f.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-10 pt-6">
        {filteredBooks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-warm-border p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink mb-1">
              {activeFilter === 'all' ? '아직 포토북이 없어요' : `${BOOK_TYPE_LABEL[activeFilter] ?? activeFilter} 포토북이 없어요`}
            </p>
            <p className="text-xs text-ink-muted mb-5">사진을 모아 멋진 포토북을 제작할 수 있어요</p>
            {isOwner && activeFilter !== 'PERSONAL' && (
              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}/books/templates`)}
                className="h-10 px-6 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors shadow-sm"
              >
                포토북 만들기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} navigate={navigate} groupId={Number(groupId)} onDelete={handleRequestDelete} onPreview={(b) => setPreviewBookId(b.id)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB: 새 포토북 (방장만) */}
      {isOwner && (
        <button
          type="button"
          onClick={() => navigate(`/groups/${groupId}/books/templates`)}
          className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 z-40 w-14 h-14 rounded-full bg-brand hover:bg-brand-hover shadow-lg text-white flex items-center justify-center transition-colors"
          aria-label="새 포토북 만들기"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {previewBookId && previewBook && (
        <BookPreviewModal
          book={previewBook}
          pages={previewPages}
          coverTemplateUid={previewBook.coverTemplateUid}
          coverParams={previewBook.coverParams}
          onClose={() => setPreviewBookId(null)}
        />
      )}

      <ConfirmDialog
        open={!!bookToDelete}
        title="포토북을 삭제할까요?"
        description={
          bookToDelete
            ? `"${bookToDelete.title}" 포토북이 영구적으로 삭제됩니다.${deleteError ? `\n\n${deleteError}` : ''}`
            : ''
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={handleConfirmDelete}
        onClose={() => setBookToDelete(null)}
        isPending={deleteBook.isPending}
      />
    </div>
  );
}
