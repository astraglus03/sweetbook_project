import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages, useAddPages, useDeletePage, useFinalizeBook } from '../features/books/hooks/useBooks';
import { usePhotos } from '../features/photos/hooks/usePhotos';

export function BookEditorPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const numBookId = Number(bookId);
  const { data: book, isLoading: bookLoading } = useBook(numBookId);
  const { data: pagesData, isLoading: pagesLoading } = useBookPages(numBookId);
  const addPages = useAddPages(numBookId);
  const deletePage = useDeletePage(numBookId);
  const finalizeBook = useFinalizeBook(numBookId);

  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  const groupId = book?.groupId;
  const { data: photosData } = usePhotos(groupId, { limit: 100 });

  const pages = pagesData ?? [];
  const photos = photosData?.photos ?? [];
  const isFinalized = book?.status !== 'DRAFT';

  const handleAddPhotos = () => {
    if (selectedPhotos.length === 0) return;
    const newPages = selectedPhotos.map((photoId) => ({ photoId }));
    addPages.mutate(newPages, {
      onSuccess: () => setSelectedPhotos([]),
    });
  };

  const handleAutoLayout = () => {
    const unusedPhotos = photos
      .filter((p) => !pages.some((pg) => pg.photoId === p.id))
      .slice(0, 50);
    if (unusedPhotos.length === 0) return;
    const newPages = unusedPhotos.map((p) => ({ photoId: p.id }));
    addPages.mutate(newPages);
  };

  const handleFinalize = () => {
    if (!window.confirm('최종화하면 더 이상 편집할 수 없습니다. 진행하시겠습니까?')) return;
    finalizeBook.mutate(undefined, {
      onSuccess: () => navigate(`/books/${bookId}/preview`),
    });
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId],
    );
  };

  if (bookLoading || pagesLoading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <p className="text-sm text-red-500">포토북을 찾을 수 없습니다</p>
      </div>
    );
  }

  const currentPage = pages[selectedPageIndex];

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      {/* Toolbar */}
      <div className="h-12 bg-ink flex items-center justify-between px-4 lg:px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/groups/${book.groupId}`)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white text-sm font-medium truncate max-w-[200px]">
            {book.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs">
            {pages.length}p / {book.pageCount ?? 0}p
          </span>
          {book.status === 'DRAFT' && (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={finalizeBook.isPending || pages.length === 0}
              className="h-8 px-4 text-xs font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-40"
            >
              {finalizeBook.isPending ? '처리 중...' : '최종화'}
            </button>
          )}
          {isFinalized && (
            <button
              type="button"
              onClick={() => navigate(`/books/${bookId}/preview`)}
              className="h-8 px-4 text-xs font-semibold text-ink bg-white rounded-full hover:bg-warm-bg transition-colors"
            >
              미리보기
            </button>
          )}
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Canvas (current page) */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-warm-bg">
          {currentPage ? (
            <div className="bg-white shadow-lg rounded overflow-hidden max-w-[500px] w-full aspect-square flex flex-col items-center justify-center">
              {currentPage.photoId && currentPage.thumbnailUrl ? (
                <img
                  src={currentPage.mediumUrl || currentPage.thumbnailUrl}
                  alt={`페이지 ${currentPage.pageNumber}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-ink-muted">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                  </svg>
                  <p className="text-xs">사진 없음</p>
                </div>
              )}
              {currentPage.chapterTitle && (
                <div className="w-full px-4 py-2 bg-warm-bg border-t border-warm-border">
                  <p className="text-sm font-bold text-ink">{currentPage.chapterTitle}</p>
                </div>
              )}
              {currentPage.caption && (
                <div className="w-full px-4 py-1.5">
                  <p className="text-xs text-ink-sub">{currentPage.caption}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-ink-muted">
              <p className="text-sm">우측에서 사진을 선택하여 페이지를 추가하세요</p>
            </div>
          )}
        </div>

        {/* Middle: Page list */}
        <div className="w-[140px] lg:w-[160px] bg-white border-x border-warm-border overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-warm-border">
            <p className="text-xs font-semibold text-ink-muted">페이지 ({pages.length})</p>
          </div>
          <div className="p-2 space-y-2">
            {/* Cover placeholder */}
            <button
              type="button"
              onClick={() => setSelectedPageIndex(-1)}
              className={`w-full aspect-[3/4] rounded-lg border-2 flex items-center justify-center text-xs transition-colors ${
                selectedPageIndex === -1
                  ? 'border-brand bg-brand/5'
                  : 'border-warm-border hover:border-brand/40'
              }`}
            >
              <span className="text-ink-muted">표지</span>
            </button>

            {/* Pages */}
            {pages.map((page, index) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedPageIndex(index)}
                className={`w-full aspect-[3/4] rounded-lg border-2 overflow-hidden relative group transition-colors ${
                  selectedPageIndex === index
                    ? 'border-brand'
                    : 'border-warm-border hover:border-brand/40'
                }`}
              >
                {page.thumbnailUrl ? (
                  <img src={page.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-warm-bg flex items-center justify-center text-[10px] text-ink-muted">
                    내지
                  </div>
                )}
                <span className="absolute bottom-0.5 right-1 text-[9px] text-white bg-black/40 px-1 rounded">
                  {page.pageNumber}
                </span>
                {!isFinalized && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage.mutate(page.id);
                    }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ×
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Photo selection */}
        <div className="w-[200px] lg:w-[240px] bg-white overflow-y-auto flex-shrink-0 hidden sm:block">
          <div className="p-3 border-b border-warm-border">
            <p className="text-xs font-semibold text-ink">사진 선택</p>
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-2 gap-1 p-2">
            {photos.map((photo) => {
              const isSelected = selectedPhotos.includes(photo.id);
              const isUsed = pages.some((pg) => pg.photoId === photo.id);
              return (
                <button
                  key={photo.id}
                  type="button"
                  disabled={isFinalized}
                  onClick={() => togglePhotoSelection(photo.id)}
                  className={`aspect-square rounded overflow-hidden relative border-2 transition-colors ${
                    isSelected
                      ? 'border-brand'
                      : isUsed
                        ? 'border-green-300 opacity-60'
                        : 'border-transparent hover:border-brand/30'
                  }`}
                >
                  <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-brand/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {isUsed && !isSelected && (
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          {!isFinalized && (
            <div className="p-3 border-t border-warm-border space-y-2">
              <button
                type="button"
                onClick={handleAddPhotos}
                disabled={selectedPhotos.length === 0 || addPages.isPending}
                className="w-full h-9 text-xs font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-40"
              >
                {addPages.isPending ? '추가 중...' : `선택 추가 (${selectedPhotos.length})`}
              </button>
              <button
                type="button"
                onClick={handleAutoLayout}
                disabled={addPages.isPending}
                className="w-full h-9 text-xs font-medium text-brand border border-brand rounded-full hover:bg-brand/5 transition-colors disabled:opacity-40"
              >
                AI 자동 배치
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
