import { useState } from 'react';
import { useGroupBooks, useBook, useBookPages } from '../hooks/useBooks';
import { BookPreviewModal } from './BookPreviewModal';

const SPEC_LABEL = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

const STATUS_INFO = {
  DRAFT: { label: '편집 중', cls: 'bg-gray-100 text-gray-700' },
  PROCESSING: { label: 'PDF 변환 중', cls: 'bg-blue-50 text-blue-700' },
  READY: { label: '결제 대기', cls: 'bg-brand/10 text-brand' },
  ORDERED: { label: '주문 완료', cls: 'bg-green-50 text-green-700' },
  COMPLETED: { label: '배송 완료', cls: 'bg-green-50 text-green-700' },
};

function BookCoverThumb({ title }) {
  const initial = title?.[0] ?? '?';
  return (
    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-brand/20 to-brand/5 border border-warm-border">
      <span className="font-display text-2xl text-brand/80 font-bold">{initial}</span>
    </div>
  );
}

function BookCard({ book, navigate, onPreview }) {
  const info = STATUS_INFO[book.status] ?? { label: book.status, cls: 'bg-gray-100 text-gray-600' };
  const specLabel = SPEC_LABEL[book.bookSpecUid] || book.bookSpecUid;

  return (
    <div className="bg-white rounded-2xl border border-warm-border p-4 lg:p-5 flex gap-4">
      <BookCoverThumb title={book.title} />
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-[15px] font-bold text-ink truncate">{book.title}</h3>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${info.cls}`}>
            {info.label}
          </span>
        </div>
        <p className="text-[12px] text-ink-muted">
          {specLabel} · {book.pageCount}페이지
        </p>
        {book.createdAt && (
          <p className="text-[11px] text-ink-muted mt-0.5">
            생성일 {new Date(book.createdAt).toLocaleDateString('ko-KR')}
          </p>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {book.status === 'DRAFT' && (
            <button type="button" onClick={() => navigate(`/books/${book.id}/editor`)}
              className="h-9 px-4 text-[13px] font-semibold bg-brand text-white rounded-full hover:bg-brand-hover transition-colors shadow-sm">
              이어서 편집
            </button>
          )}
          {book.status === 'PROCESSING' && (
            <div className="flex items-center gap-2 h-9 px-4 bg-warm-bg rounded-full border border-warm-border">
              <div className="animate-spin w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full" />
              <span className="text-[12px] text-brand font-medium">변환 진행중</span>
            </div>
          )}
          {(book.status === 'READY' || book.status === 'ORDERED' || book.status === 'COMPLETED') && (
            <>
              <button type="button" onClick={() => onPreview?.(book)}
                className="h-9 px-4 text-[13px] font-medium bg-white border border-warm-border text-ink rounded-full hover:bg-warm-bg transition-colors">
                미리보기
              </button>
              <button type="button" onClick={() => navigate(`/books/${book.id}/order`)}
                className="h-9 px-4 text-[13px] font-bold bg-brand text-white rounded-full hover:bg-brand-hover transition-colors shadow-sm">
                {book.status === 'READY' ? '주문하기' : '주문 현황'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function GroupBooksTab({ groupId, navigate }) {
  const { data: books, isLoading } = useGroupBooks(groupId);
  const [previewBookId, setPreviewBookId] = useState(null);
  const { data: previewBook } = useBook(previewBookId);
  const { data: previewPages } = useBookPages(previewBookId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  const bookList = books ?? [];

  if (bookList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-warm-border p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-brand/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-ink mb-1">첫 포토북을 만들어보세요</p>
        <p className="text-xs text-ink-muted mb-5">사진을 모아 멋진 포토북을 제작할 수 있어요</p>
        <button type="button" onClick={() => navigate(`/groups/${groupId}/books/templates`)}
          className="h-10 px-6 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors shadow-sm">
          포토북 만들기
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] font-bold text-ink-sub uppercase tracking-wider">
          포토북 · {bookList.length}
        </p>
        <button type="button" onClick={() => navigate(`/groups/${groupId}/books/templates`)}
          className="h-9 px-4 text-[13px] font-semibold text-brand border border-brand rounded-full hover:bg-brand/5 transition-colors">
          + 새 포토북
        </button>
      </div>
      <div className="space-y-3">
        {bookList.map((book) => (
          <BookCard key={book.id} book={book} navigate={navigate} onPreview={(b) => setPreviewBookId(b.id)} />
        ))}
      </div>

      {previewBookId && previewBook && (
        <BookPreviewModal
          book={previewBook}
          pages={previewPages}
          coverTemplateUid={previewBook.coverTemplateUid}
          coverParams={previewBook.coverParams}
          onClose={() => setPreviewBookId(null)}
        />
      )}
    </div>
  );
}
