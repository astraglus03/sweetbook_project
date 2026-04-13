import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookPreviewModal } from '../features/books/components/BookPreviewModal';
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
  useSetCover,
} from '../features/books/hooks/useBooks';
import { usePhotos, useUploadPhotos } from '../features/photos/hooks/usePhotos';

const SPEC_NAMES = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

// Aspect ratios per book spec (width / height)
const SPEC_ASPECT_RATIO = {
  SQUAREBOOK_HC: 1,
  PHOTOBOOK_A4_SC: 210 / 297,
  PHOTOBOOK_A5_SC: 148 / 210,
};

const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

import { TemplateCanvas } from '../features/books/components/TemplateCanvas';
import { CoverComposer } from '../features/books/components/CoverComposer';

// ─── Template Picker Modal ────────────────────────────────

function TemplatePicker({ availableTemplates, onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('content');

  const tabs = [
    { id: 'cover', label: '표지' },
    { id: 'content', label: '내지' },
    { id: 'divider', label: '간지' },
    { id: 'publish', label: '발행면' },
  ];

  const templates = availableTemplates[activeTab] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-warm-border flex flex-col gap-3">
          <div>
            <h3 className="text-base font-bold text-ink">템플릿 선택</h3>
            <p className="text-xs text-ink-sub mt-1">추가할 페이지의 레이아웃을 선택하세요</p>
          </div>
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand text-white'
                    : 'bg-warm-bg text-ink hover:bg-warm-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {templates.length === 0 ? (
            <div className="text-center py-10 text-ink-muted text-sm">
              해당하는 템플릿이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {templates.map((tpl) => {
                const photoSlots = Object.values(tpl.parameters ?? {}).filter((p) => p.binding === 'file' || p.binding === 'rowGallery').length;
                const textSlots = Object.values(tpl.parameters ?? {}).filter((p) => p.binding === 'text').length;
                return (
                  <button
                    key={tpl.templateUid}
                    type="button"
                    onClick={() => onSelect(tpl, activeTab)}
                    className="border border-warm-border rounded-xl p-3 text-left hover:border-brand hover:bg-brand/5 transition-colors relative"
                  >
                    {tpl.thumbnail || tpl.thumbnails?.layout ? (
                      <img src={tpl.thumbnail || tpl.thumbnails?.layout} alt={tpl.templateName} className="w-full aspect-[4/3] object-cover rounded-lg mb-2 bg-warm-bg border border-warm-border/50" />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-warm-bg rounded-lg mb-2 flex items-center justify-center text-ink-muted text-xs border border-warm-border/50">
                        미리보기 없음
                      </div>
                    )}
                    <h4 className="text-sm font-semibold text-ink line-clamp-1 mb-0.5">{tpl.templateName}</h4>
                    <p className="text-[10px] text-ink-sub mb-1 line-clamp-1">
                      {tpl.description || (tpl.theme && `${tpl.theme} 테마`)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                        사진 {photoSlots}장
                      </span>
                      <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        텍스트 {textSlots}개
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Photo Picker Modal ───────────────────────────────────

function PhotoPicker({ photos, onSelect, onClose, groupId }) {
  const upload = useUploadPhotos(groupId);
  
  const handleFileChange = (e) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    upload.mutate({ files }, {
      onSuccess: () => {
        alert('사진이 성공적으로 업로드되었습니다.');
      },
      onError: () => {
        alert('사진 업로드에 실패했습니다.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-warm-border flex justify-between items-center bg-warm-bg rounded-t-2xl">
          <h3 className="text-base font-bold text-ink">사진 보관함</h3>
          <div className="relative">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
              disabled={upload.isPending}
            />
            <button className="h-8 px-4 bg-brand text-white text-xs font-semibold rounded-full hover:bg-brand-hover transition-colors disabled:bg-gray-300 shadow-sm transition-transform active:scale-95">
              {upload.isPending ? '업로드 중...' : '+ 새 사진 올리기'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 ? (
            <div className="text-center py-10 text-ink-muted text-sm">
              보관함에 등록된 사진이 없습니다. 상단 버튼으로 기기의 사진을 업로드해주세요.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onSelect(photo)}
                  className="aspect-square rounded-lg overflow-hidden border border-warm-border hover:border-brand hover:ring-2 hover:ring-brand/30 transition shadow-sm"
                >
                  <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
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
  const setCover = useSetCover(numBookId);

  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [targetPageIndex, setTargetPageIndex] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(null);
  const [pendingParams, setPendingParams] = useState({});
  const [pendingPageId, setPendingPageId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [coverMode, setCoverMode] = useState(false);
  const [coverTemplateUid, setCoverTemplateUid] = useState(null);
  const [coverParams, setCoverParams] = useState({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const groupId = book?.groupId;
  const { data: photosData } = usePhotos(groupId, { limit: 100 });

  const pages = pagesData ?? [];
  const photos = photosData?.photos ?? [];
  const theme = book?.theme;
  const isDraft = book?.status === 'DRAFT';
  const isFailed = book?.status === 'FAILED';
  const isEditable = isDraft;
  const isFinalized = !isDraft && !isFailed;
  const bookSpecUid = book?.bookSpecUid;
  const aspectRatio = SPEC_ASPECT_RATIO[bookSpecUid] ?? 0.75;

  // Watch for page additions to safely navigate after API refetch completes
  useEffect(() => {
    if (targetPageIndex !== null && pagesData?.length > targetPageIndex) {
      setCoverMode(false);
      setSelectedPageIndex(targetPageIndex);
      setTargetPageIndex(null);
    }
  }, [pagesData?.length, targetPageIndex]);

  const pageMin = specInfo?.pageMin ?? 24;
  const pageMax = specInfo?.pageMax ?? 130;
  const currentPages = pages.length;
  const isSufficient = currentPages >= pageMin;
  const progressPercent = Math.min(100, Math.round((currentPages / pageMin) * 100));

  // Current available templates combined
  const availableTemplatesObj = availableTemplates || { content: [], cover: [], divider: [], publish: [] };
  const allTemplates = [
    ...(availableTemplatesObj.cover || []),
    ...(availableTemplatesObj.content || []),
    ...(availableTemplatesObj.divider || []),
    ...(availableTemplatesObj.publish || []),
  ];

  // Find the template info for the current page
  const currentPage = pages[selectedPageIndex];
  const currentTemplate = useMemo(() => {
    if (!currentPage) return null;
    const templateUid = currentPage.contentTemplateUid || currentPage.coverTemplateUid || currentPage.templateUid;
    if (!templateUid) return null;
    return allTemplates.find((t) => t.templateUid === templateUid) ?? null;
  }, [currentPage, allTemplates]);

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
      const firstPhotoKey = Object.entries(currentTemplate?.parameters ?? {})
        .find(([, v]) => v.binding === 'file')?.[0];
      if (showPhotoPicker === firstPhotoKey) {
        updatePage.mutate({ pageId: currentPage.id, photoId: photo.id });
      }
    }
    setShowPhotoPicker(null);
  };

  const handleAddPageWithTemplate = (tpl, tabId) => {
    // Cover template selection
    if (showTemplatePicker?.type === 'COVER' || tabId === 'cover') {
      setCoverTemplateUid(tpl.templateUid);
      setCoverMode(true);
      setShowTemplatePicker(null);
      return;
    }

    if (showTemplatePicker?.type === 'UPDATE') {
      const { pageId } = showTemplatePicker;
      updatePage.mutate({ 
        pageId, 
        contentTemplateUid: tpl.templateUid,
      });
      setShowTemplatePicker(null);
      return;
    }

    // API는 contentTemplateUid, templateParams만 인식
    const pagesToAdd = [{
      contentTemplateUid: tpl.templateUid,
      templateParams: {},
    }];
    
    addPages.mutate(pagesToAdd, {
      onSuccess: () => {
        setShowTemplatePicker(null);
        setCoverMode(false);
        setTargetPageIndex(currentPages + pagesToAdd.length - 1);
      },
      onError: (err) => {
        console.error(err);
        alert('페이지 추가에 실패했습니다.');
        setShowTemplatePicker(null);
      }
    });
  };

  const handleFinalize = async () => {
    if (!isSufficient) {
      window.alert(`최소 ${pageMin}페이지가 필요합니다. 현재 ${currentPages}페이지.`);
      return;
    }
    if (!window.confirm('최종화하면 더 이상 편집할 수 없습니다. 진행하시겠습니까?')) return;
    try {
      if (coverTemplateUid) {
        await setCover.mutateAsync({
          templateUid: coverTemplateUid,
          parameters: coverParams,
        });
      }
    } catch (err) {
      console.error(err);
      window.alert('표지 저장에 실패했습니다.');
      return;
    }
    finalizeBook.mutate(undefined, {
      onSuccess: () => navigate(`/books/${bookId}/order`),
    });
  };

  const handleRetry = () => {
    if (!window.confirm('FAILED 상태를 초기화합니다. 진행하시겠습니까?')) return;
    retryBook.mutate();
  };

  // Cover template resolution (must be before early returns)
  const coverTemplates = availableTemplatesObj.cover || [];
  const resolvedCoverTemplate = useMemo(() => {
    if (coverTemplateUid) {
      return coverTemplates.find((t) => t.templateUid === coverTemplateUid) ?? coverTemplates[0] ?? null;
    }
    return coverTemplates[0] ?? null;
  }, [coverTemplateUid, coverTemplates]);

  // Auto-set cover on first load + start in cover mode when no pages
  useEffect(() => {
    if (!coverTemplateUid && coverTemplates.length > 0) {
      setCoverTemplateUid(coverTemplates[0].templateUid);
    }
    // If no pages yet, auto-enter cover mode
    if (pages.length === 0 && coverTemplates.length > 0 && !coverMode) {
      setCoverMode(true);
    }
  }, [coverTemplates, coverTemplateUid, pages.length, coverMode]);

  const hasPendingChanges = pendingPageId === currentPage?.id && Object.keys(pendingParams).length > 0;

  // Page swap for reorder
  // BE UpdatePageDto에 pageNumber 필드가 없으므로 시각적 순서만 교환
  // BE에 pageNumber 수정 or reorder API 추가 필요
  const fillTestData = () => {
    const missingCount = Math.max(0, pageMin - currentPages);
    if (missingCount <= 0) {
      alert("이미 충분한 페이지가 있습니다.");
      return;
    }

    const contentTemplates = availableTemplatesObj.content || [];
    if (contentTemplates.length === 0) {
      alert("사용할 수 있는 내지 템플릿이 없습니다.");
      return;
    }

    const defaultTemplate = contentTemplates[0];
    const mockParams = {};

    if (defaultTemplate.parameters) {
      Object.entries(defaultTemplate.parameters).forEach(([key, def]) => {
        if (def.binding === 'file' || def.binding === 'rowGallery') {
          const randomPhotoId = photos.length > 0 ? photos[Math.floor(Math.random() * photos.length)].id : '';
          if (randomPhotoId) {
            mockParams[key] = String(randomPhotoId);
          }
        } else if (def.binding === 'text') {
          mockParams[key] = '테스트 내용입니다.';
        }
      });
    }

    const pagesToAdd = Array.from({ length: missingCount }).map(() => ({
      contentTemplateUid: defaultTemplate.templateUid,
      templateParams: mockParams,
    }));

    addPages.mutate(pagesToAdd, {
      onSuccess: () => {
        setTargetPageIndex(currentPages + missingCount - 1);
      },
      onError: () => {
        alert("테스트 데이터 채우기에 실패했습니다.");
      }
    });
  };

  const handleSwapPages = (indexA, indexB) => {
    if (indexB < 0 || indexB >= pages.length) return;
    const pageA = pages[indexA];
    const pageB = pages[indexB];
    if (!pageA || !pageB) return;
    // 두 페이지의 pageNumber를 교환
    const numA = pageA.pageNumber;
    const numB = pageB.pageNumber;
    updatePage.mutate(
      { pageId: pageA.id, pageNumber: numB },
      {
        onSuccess: () => {
          updatePage.mutate(
            { pageId: pageB.id, pageNumber: numA },
          );
        },
      }
    );
    setSelectedPageIndex(indexB);
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

  const isPersonal = book?.bookType === 'PERSONAL';

  return (
    <div className="h-screen bg-warm-bg flex flex-col overflow-hidden">
      {isPersonal && (
        <div className="bg-gradient-to-r from-brand/20 to-brand/10 border-b border-brand/30 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-ink">
            <span className="font-semibold">✨ 개인 포토북</span>
            <span className="text-ink/60">
              얼굴 인식으로 자동 생성된 당신만의 포토북
            </span>
          </div>
          <button
            onClick={() =>
              navigate(
                `/groups/${book.groupId}/books/personal/${numBookId}/review`,
              )
            }
            className="text-xs text-brand font-semibold hover:underline whitespace-nowrap"
          >
            사진 검수 →
          </button>
        </div>
      )}
      {/* Search Modal */}
      {showPreviewModal && (
        <BookPreviewModal
          book={book}
          pages={pages}
          coverTemplateUid={coverTemplateUid}
          coverParams={coverParams}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
      
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
            {SPEC_NAMES[bookSpecUid] ?? bookSpecUid} · {theme}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5">
            <button type="button" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)))}
              className="text-white/70 hover:text-white text-sm font-bold w-5 h-5 flex items-center justify-center">−</button>
            <span className="text-white/80 text-[10px] font-medium w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)))}
              className="text-white/70 hover:text-white text-sm font-bold w-5 h-5 flex items-center justify-center">+</button>
          </div>
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
            <>
              <button
                type="button"
                onClick={fillTestData}
                disabled={addPages.isPending}
                className="h-8 px-4 text-xs font-semibold text-white bg-green-500 rounded-full hover:bg-green-600 transition-colors disabled:opacity-40"
              >
                {addPages.isPending ? '처리 중...' : '임시 데이터 채우기'}
              </button>
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="h-8 px-4 text-xs font-semibold text-white/90 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                미리보기
              </button>
              <button type="button" onClick={handleFinalize} disabled={finalizeBook.isPending || !isSufficient}
                className="h-8 px-4 text-xs font-semibold text-white bg-brand rounded-full hover:bg-brand-hover transition-colors disabled:opacity-40">
                {finalizeBook.isPending ? '처리 중...' : '최종화 완료'}
              </button>
            </>
          )}
          {isFinalized && (
            <button type="button" onClick={() => navigate(`/books/${bookId}/order`)}
              className="h-8 px-4 text-xs font-semibold text-ink bg-white rounded-full hover:bg-warm-bg transition-colors">
              주문 상태 보기
            </button>
          )}
        </div>
      </div>

      {/* Failed banner */}
      {isFailed && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex-shrink-0">
          <p className="text-sm text-red-700">포토북 생성에 실패했습니다. "재시도" 버튼을 눌러 다시 편집하세요.</p>
        </div>
      )}

      {/* Progress */}
      {isDraft && (
        <div className="bg-white border-b border-warm-border px-4 lg:px-5 py-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-ink-sub">페이지 구성</span>
            <span className="text-[11px] font-medium text-ink">{currentPages} / {pageMin}p (최소)</span>
          </div>
          <div className="h-1.5 bg-warm-border rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${isSufficient ? 'bg-green-500' : 'bg-brand'}`}
              style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* Main layout — fills remaining height */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Center: Template Canvas */}
        <div className="flex-1 flex flex-col items-center p-4 lg:p-6 bg-warm-bg overflow-y-auto">
          {/* Cover mode */}
          {coverMode ? (
            <>
              <div style={{ width: `${Math.round(700 * zoom)}px`, maxWidth: '100%' }} className="mb-3">
                <p className="text-[11px] text-ink-sub mb-2">
                  <span className="font-semibold text-brand">표지 구성</span>
                </p>
                <CoverComposer
                  groupId={groupId}
                  templateUid={coverTemplateUid}
                  params={coverParams}
                  onChange={(newTemplateUid, newParams) => {
                    setCoverTemplateUid(newTemplateUid);
                    setCoverParams(newParams);
                  }}
                  availableTemplates={coverTemplates}
                  photos={photos}
                />
              </div>
            </>
          ) : currentPage && currentTemplate ? (
            <>
              <div style={{ width: `${Math.round(700 * zoom)}px`, maxWidth: '100%' }} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-ink-sub">
                    템플릿: <span className="font-medium text-ink">{currentTemplate.templateName}</span>
                    {' · '}페이지 {currentPage.pageNumber}
                  </p>
                  {currentTemplate.thumbnail && (
                    <details className="text-[10px]">
                      <summary className="cursor-pointer text-brand hover:text-brand-hover font-medium select-none">
                        예시 보기
                      </summary>
                      <div className="mt-2 rounded-lg border border-warm-border overflow-hidden shadow-sm bg-white">
                        <img src={currentTemplate.thumbnail} alt="내지 예시" className="w-full h-auto" />
                      </div>
                    </details>
                  )}
                </div>
                <TemplateCanvas
                  template={currentTemplate}
                  params={currentParams}
                  photos={photos}
                  isEditable={isEditable}
                  templateKind="content"
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
            </>
          ) : currentPage && !currentTemplate ? (
            <div className="text-center text-ink-muted mt-20">
              <p className="text-sm">이 페이지에 템플릿이 지정되지 않았습니다</p>
              {isEditable && allTemplates.length > 0 && (
                <button type="button"
                  onClick={() => setShowTemplatePicker({ type: 'UPDATE', pageId: currentPage.id })}
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
        <div className="w-[160px] lg:w-[180px] bg-white border-l border-warm-border flex-shrink-0 flex flex-col overflow-hidden">
          {/* Sticky header */}
          <div className="p-3 border-b border-warm-border flex items-center justify-between flex-shrink-0">
            <p className="text-xs font-semibold text-ink-muted">페이지 ({currentPages})</p>
            {isEditable && (
              <button type="button" onClick={() => setShowTemplatePicker({ type: 'ADD' })}
                className="w-6 h-6 rounded-full bg-brand text-white text-sm flex items-center justify-center hover:bg-brand-hover transition-colors shadow-sm">
                +
              </button>
            )}
          </div>
          {/* Scrollable page list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* Cover card */}
            <button
              type="button"
              onClick={() => { setCoverMode(true); setSelectedPageIndex(-1); }}
              className={`w-full rounded-lg border-2 overflow-hidden flex flex-col items-center justify-center p-2 transition-colors ${
                coverMode
                  ? 'border-brand bg-brand/5'
                  : 'border-dashed border-brand/30 bg-brand/5 hover:border-brand/50'
              }`}
              style={{ aspectRatio: `${aspectRatio}` }}
            >
              {resolvedCoverTemplate ? (
                <>
                  <span className="text-[10px] font-bold text-brand">표지</span>
                  <span className="text-[8px] text-ink-muted mt-0.5 line-clamp-1">{resolvedCoverTemplate.templateName}</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-brand/50">표지</span>
                  <span className="text-[9px] text-ink-muted">미설정</span>
                </>
              )}
            </button>

            {/* Pages */}
            {pages.map((page, index) => {
              const templateUid = page.contentTemplateUid || page.coverTemplateUid || page.templateUid;
              const tpl = allTemplates.find((t) => t.templateUid === templateUid);
              const hasPhoto = page.thumbnailUrl || (page.templateParams && Object.values(page.templateParams).some((v) => v));
              const isSelected = !coverMode && selectedPageIndex === index;
              return (
                <div key={page.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      setCoverMode(false);
                      setSelectedPageIndex(index);
                      setPendingPageId(null);
                      setPendingParams({});
                    }}
                    className={`w-full rounded-lg border-2 overflow-hidden relative transition-colors flex flex-col ${isSelected ? 'border-brand' : 'border-warm-border hover:border-brand/40'}`}
                    style={{ aspectRatio: `${aspectRatio}` }}
                  >
                    {page.thumbnailUrl ? (
                      <img src={page.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-warm-bg flex flex-col items-center justify-center p-1">
                        <span className="text-[8px] font-semibold text-ink-sub text-center leading-tight mb-0.5">
                          {tpl?.templateName ?? '템플릿 선택 필요'}
                        </span>
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-1 text-[9px] text-white bg-black/40 px-1 rounded">
                      {index + 1}
                    </span>
                    {hasPhoto && (
                      <span className="absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-green-500 rounded-full" />
                    )}
                  </button>
                  {/* Reorder & delete buttons on hover */}
                  {isEditable && (
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {index > 0 && (
                        <button type="button" onClick={() => handleSwapPages(index, index - 1)}
                          className="w-5 h-5 bg-ink/70 text-white rounded flex items-center justify-center text-[10px] hover:bg-ink shadow-sm">↑</button>
                      )}
                      {index < pages.length - 1 && (
                        <button type="button" onClick={() => handleSwapPages(index, index + 1)}
                          className="w-5 h-5 bg-ink/70 text-white rounded flex items-center justify-center text-[10px] hover:bg-ink shadow-sm">↓</button>
                      )}
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); deletePage.mutate(page.id); }}
                        className="w-5 h-5 bg-red-500 text-white rounded flex items-center justify-center text-[10px] hover:bg-red-600 shadow-sm">
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty slots */}
            {isDraft && currentPages < pageMin &&
              Array.from({ length: Math.min(3, pageMin - currentPages) }).map((_, i) => (
                <div key={`empty-${i}`} className="w-full rounded-lg border-2 border-dashed border-warm-border flex items-center justify-center"
                  style={{ aspectRatio: `${aspectRatio}` }}>
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
      {showTemplatePicker && (
        <TemplatePicker
          availableTemplates={availableTemplatesObj}
          onSelect={handleAddPageWithTemplate}
          onClose={() => setShowTemplatePicker(null)}
        />
      )}

      {showPhotoPicker && (
        <PhotoPicker
          photos={photos}
          groupId={groupId}
          onSelect={handlePhotoSelect}
          onClose={() => setShowPhotoPicker(null)}
        />
      )}
    </div>
  );
}
