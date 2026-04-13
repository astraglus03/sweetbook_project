import { TemplateCanvas } from '../../books/components/TemplateCanvas';

/**
 * CoverPreview — 표지 후보 카드 미리보기
 *
 * Props:
 *   template    — 전체 템플릿 객체 (elements + parameters). 있으면 실제 레이아웃으로 렌더
 *   templateUid — 템플릿 UID (fallback 표시용)
 *   params      — { [slotId]: photoId | text }
 *   photos      — 그룹 사진 배열
 *   className   — 추가 CSS 클래스
 */
export function CoverPreview({
  template = null,
  params = {},
  photos = [],
  className = '',
}) {
  // 실제 템플릿이 있으면 TemplateCanvas로 정확한 레이아웃 렌더
  if (template) {
    return (
      <div className={`relative ${className}`}>
        <TemplateCanvas
          template={template}
          params={params}
          photos={photos}
          isEditable={false}
          templateKind="cover"
        />
      </div>
    );
  }

  // Fallback: 템플릿 정보 없이 근사치 렌더
  const firstPhotoId = Object.values(params).find(
    (v) => typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v)),
  );
  const coverPhoto = firstPhotoId
    ? photos.find((p) => String(p.id) === String(firstPhotoId))
    : null;

  const textValues = Object.entries(params)
    .filter(([, v]) => typeof v === 'string' && !/^\d+$/.test(v) && v.trim())
    .map(([, v]) => String(v));

  const primaryText = textValues[0] ?? null;

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-900 ${className}`}
      style={{ aspectRatio: '3/4' }}
    >
      {coverPhoto ? (
        <img
          src={coverPhoto.mediumUrl || coverPhoto.thumbnailUrl}
          alt="표지 사진"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-warm-bg flex items-center justify-center">
          <svg className="w-10 h-10 text-ink-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
          </svg>
        </div>
      )}

      {primaryText && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pt-10 pb-4">
          <h2 className="font-display text-white text-base lg:text-lg font-semibold leading-tight"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
            {primaryText}
          </h2>
        </div>
      )}

    </div>
  );
}
