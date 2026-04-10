import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useBook,
  useBookPages,
  useBookSpecInfo,
  useAvailableTemplates,
  useAddPages,
  useDeletePage,
  useUpdatePage,
  useFinalizeBook,
  useRetryBook,
} from '../features/books/hooks/useBooks';
import { usePhotos } from '../features/photos/hooks/usePhotos';

const SPEC_NAMES = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

// ─── Template Canvas ──────────────────────────────────────
// Renders the template layout with interactive photo/text slots

function TemplateCanvas({ template, params, photos, onParamChange, isEditable }) {
  if (!template || !template.elements) return null;

  // Calculate scale: fit elements into a container
  const allElements = template.elements;
  const maxX = Math.max(...allElements.map((e) => e.x + e.width), 1);
  const maxY = Math.max(...allElements.map((e) => e.y + e.height), 1);

  const variableElements = allElements.filter((el) => el.variable);
  const paramDefs = template.parameters ?? {};

  return (
    <div
      className="relative bg-white rounded-lg overflow-hidden border border-warm-border"
      style={{ paddingBottom: `${(maxY / maxX) * 100}%` }}
    >
      {variableElements.map((el) => {
        const left = (el.x / maxX) * 100;
        const top = (el.y / maxY) * 100;
        const width = (el.width / maxX) * 100;
        const height = (el.height / maxY) * 100;
        const def = paramDefs[el.variable];
        const isPhoto = el.type === 'photo' || def?.binding === 'file';
        const value = params?.[el.variable] ?? '';

        if (isPhoto) {
          // Find photo by looking for a numeric ID stored in params
          const assignedPhoto = photos.find((p) => String(p.id) === value);
          return (
            <div
              key={el.id}
              className="absolute"
              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
            >
              {assignedPhoto ? (
                <div className="w-full h-full relative group">
                  <img
                    src={assignedPhoto.mediumUrl || assignedPhoto.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => onParamChange(el.variable, '')}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      x
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-blue-50 border-2 border-dashed border-blue-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors">
                  <svg className="w-6 h-6 text-blue-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                  </svg>
                  <span className="text-[9px] text-blue-500 font-medium">
                    {def?.description ?? el.variable}
                  </span>
                </div>
              )}
            </div>
          );
        }

        // Text slot
        return (
          <div
            key={el.id}
            className="absolute"
            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
          >
            {isEditable ? (
              <textarea
                value={value}
                onChange={(e) => onParamChange(el.variable, e.target.value)}
                placeholder={def?.description ?? el.variable}
                className="w-full h-full bg-amber-50/50 border border-dashed border-amber-300 rounded px-1.5 py-1 text-[11px] text-ink resize-none focus:outline-none focus:border-amber-500 focus:bg-amber-50 placeholder:text-amber-400/70"
              />
            ) : (
              <div className="w-full h-full flex items-start px-1.5 py-1 text-[11px] text-ink overflow-hidden">
                {value || <span className="text-ink-muted/40">{def?.description ?? el.variable}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Template Picker Modal ────────────────────────────────

function TemplatePicker({ templates, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-warm-border">
          <h3 className="text-base font-bold text-ink">내지 템플릿 선택</h3>
          <p className="text-xs text-ink-sub mt-1">페이지에 사용할 레이아웃을 선택하세요</p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          {templates.map((tpl) => {
            const photoSlots = Object.values(tpl.parameters ?? {}).filter((p) => p.binding === 'file').length;
            const textSlots = Object.values(tpl.parameters ?? {}).filter((p) => p.binding === 'text').length;
            return (
              <button
                key={tpl.templateUid}
                type="button"
                onClick={() => onSelect(tpl)}
                className="border border-warm-border rounded-xl p-3 text-left hover:border-brand hover:bg-brand/5 transition-colors"
              >
                {tpl.thumbnail ? (
                  <img src={tpl.thumbnail} alt={tpl.templateName} className="w-full aspect-[4/3] object-cover rounded-lg mb-2 bg-warm-bg" />
                ) : (
                  <div className="w-full aspect-[4/3] bg-warm-bg rounded-lg mb-2 flex items-center justify-center text-ink-muted text-xs">
                    미리보기 없음
                  </div>
                )}
                <p className="text-sm font-medium text-ink">{tpl.templateName}</p>
                <p className="text-[10px] text-ink-sub mt-0.5">
                  사진 {photoSlots}장 · 텍스트 {textSlots}개
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Photo Picker Modal ───────────────────────────────────

function PhotoPicker({ photos, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-warm-border">
          <h3 className="text-sm font-bold text-ink">사진 선택</h3>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onSelect(photo)}
              className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-brand transition"
            >
              <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────

export function BookEditorPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const numBookId = Number(bookId);
  const { data: book, isLoading: bookLoading } = useBook(numBookId);
  const { data: pagesData, isLoading: pagesLoading } = useBookPages(numBookId);
  const { data: specInfo } = useBookSpecInfo(numBookId);
  const { data: availableTemplates } = useAvailableTemplates(numBookId);
  const addPages = useAddPages(numBookId);
  const deletePage = useDeletePage(numBookId);
  const updatePage = useUpdatePage(numBookId);
  const finalizeBook = useFinalizeBook(numBookId);
  const retryBook = useRetryBook(numBookId);

  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(null); // variable name for photo slot
  const [pendingParams, setPendingParams] = useState({}); // unsaved changes
  const [pendingPageId, setPendingPageId] = useState(null);

  const groupId = book?.groupId;
  const { data: photosData } = usePhotos(groupId, { limit: 100 });

  const pages = pagesData ?? [];
  const photos = photosData?.photos ?? [];
  const theme = book?.theme;
  const isDraft = book?.status === 'DRAFT';
  const isFailed = book?.status === 'FAILED';
  const isEditable = isDraft;
  const isFinalized = !isDraft && !isFailed;

  const pageMin = specInfo?.pageMin ?? 24;
  const pageMax = specInfo?.pageMax ?? 130;
  const currentPages = pages.length;
  const isSufficient = currentPages >= pageMin;
  const progressPercent = Math.min(100, Math.round((currentPages / pageMin) * 100));

  const contentTemplates = availableTemplates?.content ?? [];

  // Find the template info for the current page
  const currentPage = pages[selectedPageIndex];
  const currentTemplate = useMemo(() => {
    if (!currentPage?.contentTemplateUid || !contentTemplates.length) return null;
    return contentTemplates.find((t) => t.templateUid === currentPage.contentTemplateUid) ?? null;
  }, [currentPage?.contentTemplateUid, contentTemplates]);

  // Merge saved params with pending edits
  const currentParams = useMemo(() => {
    if (!currentPage) return {};
    if (pendingPageId === currentPage.id) {
      return { ...(currentPage.templateParams ?? {}), ...pendingParams };
    }
    return currentPage.templateParams ?? {};
  }, [currentPage, pendingPageId, pendingParams]);

  const handleParamChange = (key, value) => {
    if (!currentPage) return;
    if (pendingPageId !== currentPage.id) {
      setPendingPageId(currentPage.id);
      setPendingParams({ [key]: value });
    } else {
      setPendingParams((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSaveParams = () => {
    if (!currentPage || pendingPageId !== currentPage.id) return;
    const merged = { ...(currentPage.templateParams ?? {}), ...pendingParams };
    updatePage.mutate({ pageId: currentPage.id, templateParams: merged });
    setPendingPageId(null);
    setPendingParams({});
  };

  const handlePhotoSelect = (photo) => {
    if (showPhotoPicker && currentPage) {
      handleParamChange(showPhotoPicker, String(photo.id));
      // Also set the page's photoId for the first photo slot
      const firstPhotoKey = Object.entries(currentTemplate?.parameters ?? {})
        .find(([, v]) => v.binding === 'file')?.[0];
      if (showPhotoPicker === firstPhotoKey) {
        updatePage.mutate({ pageId: currentPage.id, photoId: photo.id });
      }
    }
    setShowPhotoPicker(null);
  };

  const handleAddPageWithTemplate = (tpl) => {
    addPages.mutate([{
      contentTemplateUid: tpl.templateUid,
      templateParams: {},
    }]);
    setShowTemplatePicker(false);
  };

  const handleFinalize = () => {
    if (!isSufficient) {
      window.alert(`최소 ${pageMin}페이지가 필요합니다. 현재 ${currentPages}페이지.`);
      return;
    }
    if (!window.confirm('최종화하면 더 이상 편집할 수 없습니다. 진행하시겠습니까?')) return;
    finalizeBook.mutate(undefined, {
      onSuccess: () => navigate(`/books/${bookId}/preview`),
    });
  };

  const handleRetry = () => {
    if (!window.confirm('FAILED 상태를 초기화합니다. 진행하시겠습니까?')) return;
    retryBook.mutate();
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

  const hasPendingChanges = pendingPageId === currentPage?.id && Object.keys(pendingParams).length > 0;

  return (
    <div className="min-h-screen bg-warm-bg flex flex-col">
      {/* Toolbar */}
      <div className="h-12 bg-ink flex items-center justify-between px-4 lg:px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(`/groups/${book.groupId}`)}
            className="text-white/60 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white text-sm font-medium truncate max-w-[180px]">{book.title}</span>
          <span className="text-white/30 text-xs hidden sm:inline">
            {SPEC_NAMES[book.bookSpecUid] ?? book.bookSpecUid} · {theme}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isSufficient ? 'text-green-400' : 'text-amber-400'}`}>
            {currentPages}/{pageMin}p
          </span>
          {isFailed && (
            <button type="button" onClick={handleRetry} disabled={retryBook.isPending}
              className="h-8 px-4 text-xs font-semibold text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors disabled:opacity-40">
              {retryBook.isPending ? '초기화 중...' : '재시도'}
            </button>
          )}
          {isDraft && (
            <button type="button" onClick={handleFinalize} disabled={finalizeBook.isPending || !isSufficient}
              className="h-8 px-4 text-xs font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-40">
              {finalizeBook.isPending ? '처리 중...' : '최종화'}
            </button>
          )}
          {isFinalized && (
            <button type="button" onClick={() => navigate(`/books/${bookId}/preview`)}
              className="h-8 px-4 text-xs font-semibold text-ink bg-white rounded-full hover:bg-warm-bg transition-colors">
              미리보기
            </button>
          )}
        </div>
      </div>

      {/* Failed banner */}
      {isFailed && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">포토북 생성에 실패했습니다. "재시도" 버튼을 눌러 다시 편집하세요.</p>
        </div>
      )}

      {/* Progress */}
      {isDraft && (
        <div className="bg-white border-b border-warm-border px-4 lg:px-5 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-ink-sub">페이지 구성</span>
            <span className="text-[11px] font-medium text-ink">{currentPages} / {pageMin}p (최소)</span>
          </div>
          <div className="h-2 bg-warm-border rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${isSufficient ? 'bg-green-500' : 'bg-brand'}`}
              style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: Template Canvas */}
        <div className="flex-1 flex flex-col items-center p-4 lg:p-6 bg-warm-bg overflow-y-auto">
          {currentPage && currentTemplate ? (
            <>
              <div className="max-w-[500px] w-full mb-3">
                <p className="text-[11px] text-ink-sub mb-1">
                  템플릿: <span className="font-medium text-ink">{currentTemplate.templateName}</span>
                  {' · '}페이지 {currentPage.pageNumber}
                </p>
                <TemplateCanvas
                  template={currentTemplate}
                  params={currentParams}
                  photos={photos}
                  isEditable={isEditable}
                  onParamChange={(key, val) => {
                    const def = currentTemplate.parameters?.[key];
                    if (def?.binding === 'file') {
                      setShowPhotoPicker(key);
                    } else {
                      handleParamChange(key, val);
                    }
                  }}
                />
              </div>

              {/* Save button */}
              {hasPendingChanges && isEditable && (
                <button type="button" onClick={handleSaveParams}
                  className="h-9 px-6 text-xs font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors">
                  변경 사항 저장
                </button>
              )}

              {/* Photo slot click areas (for clicking on empty photo slots) */}
            </>
          ) : currentPage && !currentTemplate ? (
            <div className="text-center text-ink-muted mt-20">
              <p className="text-sm">이 페이지에 템플릿이 지정되지 않았습니다</p>
              {isEditable && contentTemplates.length > 0 && (
                <button type="button"
                  onClick={() => {
                    // Assign the first available template
                    updatePage.mutate({ pageId: currentPage.id, contentTemplateUid: contentTemplates[0].templateUid });
                  }}
                  className="mt-3 h-9 px-5 text-xs font-medium text-brand border border-brand rounded-full hover:bg-brand/5 transition-colors">
                  템플릿 지정하기
                </button>
              )}
            </div>
          ) : (
            <div className="text-center text-ink-muted mt-20">
              <p className="text-sm">우측에서 템플릿을 선택하여 페이지를 추가하세요</p>
              <p className="text-xs mt-1 text-ink-muted/60">최소 {pageMin}페이지 필요</p>
            </div>
          )}
        </div>

        {/* Right sidebar: Page list */}
        <div className="w-[150px] lg:w-[170px] bg-white border-l border-warm-border overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-warm-border flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-muted">페이지 ({currentPages})</p>
            {isEditable && (
              <button type="button" onClick={() => setShowTemplatePicker(true)}
                className="w-6 h-6 rounded-full bg-brand text-white text-sm flex items-center justify-center hover:bg-brand-hover transition-colors">
                +
              </button>
            )}
          </div>
          <div className="p-2 space-y-2">
            {/* Cover indicator */}
            <div className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-brand/30 bg-brand/5 flex flex-col items-center justify-center">
              <span className="text-[10px] text-brand/50">표지</span>
              <span className="text-[9px] text-ink-muted">자동 설정</span>
            </div>

            {/* Pages */}
            {pages.map((page, index) => {
              const tpl = contentTemplates.find((t) => t.templateUid === page.contentTemplateUid);
              const hasPhoto = page.thumbnailUrl || (page.templateParams && Object.values(page.templateParams).some((v) => v));
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => {
                    setSelectedPageIndex(index);
                    setPendingPageId(null);
                    setPendingParams({});
                  }}
                  className={`w-full aspect-[3/4] rounded-lg border-2 overflow-hidden relative group transition-colors ${
                    selectedPageIndex === index ? 'border-brand' : 'border-warm-border hover:border-brand/40'
                  }`}
                >
                  {page.thumbnailUrl ? (
                    <img src={page.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-warm-bg flex flex-col items-center justify-center p-1">
                      <span className="text-[8px] text-ink-muted text-center leading-tight">
                        {tpl?.templateName ?? '템플릿 없음'}
                      </span>
                    </div>
                  )}
                  <span className="absolute bottom-0.5 right-1 text-[9px] text-white bg-black/40 px-1 rounded">
                    {page.pageNumber}
                  </span>
                  {hasPhoto && (
                    <span className="absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-green-500 rounded-full" />
                  )}
                  {isEditable && (
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); deletePage.mutate(page.id); }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      x
                    </button>
                  )}
                </button>
              );
            })}

            {/* Empty slots */}
            {isDraft && currentPages < pageMin &&
              Array.from({ length: Math.min(3, pageMin - currentPages) }).map((_, i) => (
                <div key={`empty-${i}`} className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-warm-border flex items-center justify-center">
                  <span className="text-[10px] text-ink-muted/40">+{currentPages + i + 1}</span>
                </div>
              ))
            }
            {isDraft && pageMin - currentPages > 3 && (
              <div className="text-center py-1">
                <span className="text-[10px] text-ink-muted/50">...외 {pageMin - currentPages - 3}p</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTemplatePicker && contentTemplates.length > 0 && (
        <TemplatePicker
          templates={contentTemplates}
          onSelect={handleAddPageWithTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {showPhotoPicker && (
        <PhotoPicker
          photos={photos}
          onSelect={handlePhotoSelect}
          onClose={() => setShowPhotoPicker(null)}
        />
      )}
    </div>
  );
}
