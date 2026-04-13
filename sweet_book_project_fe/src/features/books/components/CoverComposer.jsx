import { useState } from 'react';
import { TemplateCanvas } from './TemplateCanvas';
import { specLabel } from '../lib/bookLabels';

/**
 * CoverComposer — 표지 구성 공용 컴포넌트
 *
 * Props:
 *   groupId         — 그룹 ID (사진 picker 내부에서 사용)
 *   templateUid     — 현재 선택된 표지 템플릿 UID (controlled)
 *   params          — 현재 슬롯 params: { [slotId]: photoId | text } (controlled)
 *   onChange        — (templateUid, params) => void
 *   availableTemplates — 표지 템플릿 배열 (category === 'cover' 인 것들)
 *   photos          — 그룹 사진 배열 (PhotoGallery에서 가져온 것)
 */
export function CoverComposer({
  groupId,
  templateUid,
  params,
  onChange,
  availableTemplates = [],
  photos = [],
}) {
  const [showPhotoPicker, setShowPhotoPicker] = useState(null); // slot key or null

  const coverTemplates = availableTemplates.filter(
    (t) => (t.category ?? t.templateKind ?? '').toLowerCase() === 'cover',
  );

  // If no category filter matches (some APIs don't return category), use all passed templates
  const templateList = coverTemplates.length > 0 ? coverTemplates : availableTemplates;

  const resolvedTemplate = templateList.find((t) => t.templateUid === templateUid) ?? templateList[0] ?? null;

  const handleParamChange = (key, val) => {
    const def = resolvedTemplate?.parameters?.[key];
    if (def?.binding === 'file' || val === 'PICK') {
      setShowPhotoPicker(key);
    } else {
      onChange(templateUid, { ...params, [key]: val });
    }
  };

  const handlePhotoSelect = (photo) => {
    if (showPhotoPicker) {
      onChange(templateUid, { ...params, [showPhotoPicker]: String(photo.id) });
    }
    setShowPhotoPicker(null);
  };

  const handleTemplateSelect = (tpl) => {
    // Reset params when template changes
    onChange(tpl.templateUid, {});
  };

  return (
    <div className="space-y-4">
      {/* 템플릿 선택 */}
      {templateList.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink mb-2">
            표지 템플릿 선택 <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {templateList.map((tpl) => {
              const thumbSrc = tpl.thumbnail || tpl.thumbnails?.layout || tpl.thumbnailUrl;
              const isSelected = (templateUid ?? resolvedTemplate?.templateUid) === tpl.templateUid;
              const tplSpecLabel = tpl.bookSpecUid ? specLabel(tpl.bookSpecUid) : null;
              const tplTheme = tpl.theme || null;
              const cardLabel = [tplSpecLabel, tplTheme].filter(Boolean).join(' · ');
              return (
                <div key={tpl.templateUid} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleTemplateSelect(tpl)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-colors focus:outline-none ${
                      isSelected ? 'border-brand' : 'border-transparent hover:border-brand/40'
                    }`}
                    style={{ aspectRatio: '3/4' }}
                  >
                    {thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt={tpl.templateName ?? tpl.name ?? tpl.templateUid}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-warm-border flex items-center justify-center">
                        <span className="text-[10px] text-ink/40 text-center px-1 leading-tight">
                          {tpl.templateName ?? tpl.name ?? tpl.templateUid}
                        </span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-brand/10 flex items-center justify-center">
                        <span className="text-brand text-xl font-bold">✓</span>
                      </div>
                    )}
                  </button>
                  {cardLabel && (
                    <p className="text-[10px] text-ink/50 text-center leading-tight truncate px-0.5">
                      {cardLabel}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {resolvedTemplate && (
            <p className="text-xs text-ink/50 mt-1.5">
              {resolvedTemplate.templateName ?? resolvedTemplate.name ?? resolvedTemplate.templateUid}
            </p>
          )}
        </div>
      )}

      {/* 슬롯 편집 캔버스 */}
      {resolvedTemplate ? (
        <div>
          <p className="text-sm font-medium text-ink mb-2">슬롯 편집</p>
          <TemplateCanvas
            template={resolvedTemplate}
            params={params}
            photos={photos}
            isEditable={true}
            templateKind="cover"
            onParamChange={handleParamChange}
          />
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-ink/40">
          {templateList.length === 0 ? '사용 가능한 표지 템플릿이 없습니다' : '템플릿을 선택하세요'}
        </div>
      )}

      {/* 사진 선택 모달 */}
      {showPhotoPicker && (
        <PhotoPickerModal
          photos={photos}
          onSelect={handlePhotoSelect}
          onClose={() => setShowPhotoPicker(null)}
        />
      )}
    </div>
  );
}

// ─── 내부 사진 선택 모달 ──────────────────────────────────────────

function PhotoPickerModal({ photos, onSelect, onClose }) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label="사진 선택"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-warm-border flex justify-between items-center bg-warm-bg rounded-t-2xl">
          <h3 className="text-base font-bold text-ink">사진 선택</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/40 hover:text-ink text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 ? (
            <div className="text-center py-10 text-ink-muted text-sm">
              업로드된 사진이 없습니다.
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
                  <img
                    src={photo.thumbnailUrl || photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
