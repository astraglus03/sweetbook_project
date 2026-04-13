import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBook, useBookPages, useAvailableTemplates } from '../features/books/hooks/useBooks';
import { usePhotos } from '../features/photos/hooks/usePhotos';
import { TemplateCanvas } from '../features/books/components/TemplateCanvas';

// 인쇄용 뷰 — 브라우저의 PDF로 저장 기능을 사용해 포토북을 파일로 저장
export default function BookPrintPage() {
  const { bookId } = useParams();
  const numBookId = Number(bookId);
  const { data: book, isLoading: bookLoading } = useBook(numBookId);
  const { data: pages, isLoading: pagesLoading } = useBookPages(numBookId);
  const { data: templatesData } = useAvailableTemplates(numBookId);
  const { data: photosData } = usePhotos(book?.groupId, { limit: 200 });

  const allTemplates = useMemo(() => [
    ...(templatesData?.cover || []),
    ...(templatesData?.content || []),
    ...(templatesData?.divider || []),
    ...(templatesData?.publish || []),
  ], [templatesData]);

  const photos = photosData?.photos ?? [];

  const pageList = useMemo(() => {
    const rawPages = pages ?? [];
    const hasCover = rawPages[0]?.isCover === true;
    if (!hasCover && book?.coverTemplateUid) {
      return [
        {
          id: -1,
          isCover: true,
          contentTemplateUid: book.coverTemplateUid,
          templateParams: book.coverParams || {},
          pageNumber: 0,
        },
        ...rawPages,
      ];
    }
    return rawPages;
  }, [pages, book]);

  useEffect(() => {
    if (bookLoading || pagesLoading || !book || !pages) return;
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, [bookLoading, pagesLoading, book, pages]);

  if (bookLoading || pagesLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-ink-muted">포토북을 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: auto; margin: 0; }
          body { margin: 0; background: white; }
          .print-hint { display: none !important; }
          .print-page { page-break-after: always; page-break-inside: avoid; }
          .print-page:last-child { page-break-after: auto; }
        }
        @media screen {
          .print-page { box-shadow: 0 4px 16px rgba(0,0,0,0.08); margin: 16px auto; }
        }
      `}</style>
      <div className="bg-warm-bg min-h-screen print:bg-white">
        <div className="print-hint sticky top-0 z-10 bg-ink text-white px-4 py-3 flex items-center justify-between">
          <span className="text-xs">
            브라우저 인쇄 창에서 <b>PDF로 저장</b>을 선택하세요 · 자동으로 열리지 않으면 Ctrl/⌘+P
          </span>
          <button type="button" onClick={() => window.print()}
            className="h-7 px-3 rounded-full bg-white text-ink text-[11px] font-semibold">
            인쇄 창 열기
          </button>
        </div>
        <div className="py-4">
          <h1 className="text-center font-display text-xl font-bold text-ink mb-6 print:mb-2">
            {book.title}
          </h1>
          {pageList.map((page, idx) => {
            const tplUid = page.isCover ? book.coverTemplateUid : page.contentTemplateUid;
            const tpl = allTemplates.find((t) => t.templateUid === tplUid);
            return (
              <div
                key={page.id ?? idx}
                className="print-page bg-white mx-auto overflow-hidden"
                style={{ width: '480px', maxWidth: '95vw' }}
              >
                {tpl ? (
                  <TemplateCanvas
                    template={tpl}
                    params={page.templateParams || {}}
                    photos={photos}
                    isEditable={false}
                    templateKind={page.isCover ? 'cover' : 'content'}
                  />
                ) : page.mediumUrl || page.thumbnailUrl ? (
                  <img
                    src={page.mediumUrl || page.thumbnailUrl}
                    alt={`페이지 ${page.pageNumber}`}
                    className="w-full aspect-square object-contain bg-white"
                  />
                ) : (
                  <div className="w-full aspect-square bg-white flex items-center justify-center text-ink-muted text-sm">
                    빈 페이지
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
