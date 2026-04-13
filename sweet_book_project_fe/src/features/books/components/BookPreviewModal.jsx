import { useEffect, useState } from 'react';
import { TemplateCanvas } from './TemplateCanvas';
import { useAvailableTemplates } from '../hooks/useBooks';
import { usePhotos } from '../../photos/hooks/usePhotos';

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.2;

export function BookPreviewModal({ book, pages, coverTemplateUid, coverParams, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const rawPages = pages ?? [];
  const hasExistingCover = rawPages[0]?.isCover === true;
  const effectiveCoverTplUid = coverTemplateUid ?? book?.coverTemplateUid ?? null;
  const effectiveCoverParams = coverParams ?? book?.coverParams ?? null;
  const pageList = !hasExistingCover && effectiveCoverTplUid
    ? [
        {
          id: -1,
          isCover: true,
          contentTemplateUid: effectiveCoverTplUid,
          templateParams: effectiveCoverParams || {},
          pageNumber: 0,
        },
        ...rawPages,
      ]
    : rawPages;
  const currentPage = pageList[currentIndex];

  const { data: photosData } = usePhotos(book?.groupId, { limit: 100 });
  const photos = photosData?.photos ?? [];
  const { data: templatesData } = useAvailableTemplates(book?.id);
  const allTemplates = [
    ...(templatesData?.cover || []),
    ...(templatesData?.content || []),
    ...(templatesData?.divider || []),
    ...(templatesData?.publish || []),
  ];

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(pageList.length - 1, i + 1));

  const handleZoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)));
  const handleZoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)));
  const handleZoomReset = () => setZoom(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === '+' || e.key === '=') handleZoomIn();
      else if (e.key === '-' || e.key === '_') handleZoomOut();
      else if (e.key === '0') handleZoomReset();
      else if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageList.length]);

  const previewWidth = Math.round(480 * zoom);

  return (
    <div role="dialog" aria-modal="true" aria-label="포토북 미리보기" className="fixed inset-0 z-50 bg-ink flex flex-col">
      {/* Top bar */}
      <div className="h-[52px] flex items-center justify-between px-4 lg:px-6 flex-shrink-0 border-b border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm"
          aria-label="미리보기 닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          닫기
        </button>
        <span className="text-white text-sm font-medium">포토북 미리보기</span>
        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1" role="group" aria-label="확대/축소">
          <button type="button" onClick={handleZoomOut} disabled={zoom <= ZOOM_MIN}
            className="text-white/80 hover:text-white w-6 h-6 flex items-center justify-center text-base font-bold disabled:opacity-30"
            aria-label="축소">−</button>
          <button type="button" onClick={handleZoomReset}
            className="text-white/90 hover:text-white text-[11px] font-medium min-w-[44px] text-center"
            aria-label="원래 크기로">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={handleZoomIn} disabled={zoom >= ZOOM_MAX}
            className="text-white/80 hover:text-white w-6 h-6 flex items-center justify-center text-base font-bold disabled:opacity-30"
            aria-label="확대">+</button>
        </div>
      </div>

      {/* Page viewer */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 relative overflow-auto">
        {/* Prev button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="fixed left-4 lg:left-10 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20 transition-colors"
          aria-label="이전 페이지"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Spread view */}
        <div className="flex justify-center" style={{ minWidth: `${previewWidth}px` }}>
          {currentPage ? (
            <div
              className="bg-white shadow-2xl rounded overflow-hidden transition-all duration-200"
              style={{ width: `${previewWidth}px` }}
            >
              {allTemplates.length > 0 && (currentPage.isCover ? effectiveCoverTplUid : currentPage.contentTemplateUid) ? (
                <TemplateCanvas
                  template={allTemplates.find((t) => t.templateUid === (currentPage.isCover ? effectiveCoverTplUid : currentPage.contentTemplateUid))}
                  params={currentPage.templateParams || {}}
                  photos={photos}
                  isEditable={false}
                  templateKind={currentPage.isCover ? 'cover' : 'content'}
                />
              ) : currentPage.thumbnailUrl || currentPage.mediumUrl ? (
                <img
                  src={currentPage.mediumUrl || currentPage.thumbnailUrl}
                  alt={`페이지 ${currentPage.pageNumber}`}
                  className="w-full aspect-square object-contain bg-white mx-auto"
                />
              ) : (
                <div className="w-full aspect-square bg-warm-bg flex flex-col items-center justify-center p-8 text-center text-ink-muted text-sm border-2 border-dashed border-warm-border/50">
                  <svg className="w-10 h-10 text-ink-muted/30 mb-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="font-semibold text-ink-sub mb-1">렌더링 준비 중입니다</p>
                  <p className="text-xs text-ink-muted/70">백엔드 처리 완료 후 이미지가 표시됩니다.</p>
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
          className="fixed right-4 lg:right-10 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20 transition-colors"
          aria-label="다음 페이지"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Page indicator + hint */}
      <div className="h-12 flex items-center justify-between px-6 text-xs text-white/50 flex-shrink-0 border-t border-white/10">
        <span className="hidden sm:inline">← → 페이지 · + − 확대/축소 · 0 원래크기 · Esc 닫기</span>
        <span className="sm:hidden" />
        <span>
          {pageList.length > 0
            ? `${currentIndex + 1} / ${pageList.length} 페이지`
            : '페이지 없음'}
        </span>
      </div>
    </div>
  );
}
