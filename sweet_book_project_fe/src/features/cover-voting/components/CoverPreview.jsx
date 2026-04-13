/**
 * CoverPreview — 표지 후보 카드 미리보기
 *
 * Props:
 *   templateUid          — 템플릿 UID (표시용)
 *   templateThumbnailUrl — 템플릿 썸네일 URL (배경 레이어로 사용)
 *   params               — { [slotId]: photoId(number|string) | text(string) }
 *   photos               — 그룹 사진 배열 (photoId 매핑용)
 *   className            — 추가 CSS 클래스
 *
 * 렌더링 전략:
 *   - 정확한 좌표 메타 없이 "근사치" 렌더링:
 *     첫 번째 숫자형 값(photoId)을 배경 사진으로,
 *     문자열 값들을 하단 오버레이 텍스트로 표시.
 *   - 템플릿 썸네일이 있으면 반투명 오버레이로 레이아웃 힌트 제공.
 */
export function CoverPreview({
  templateUid,
  templateThumbnailUrl,
  params = {},
  photos = [],
  className = '',
}) {
  // 첫 번째 사진 슬롯 값 (숫자형 photoId)
  const firstPhotoId = Object.values(params).find(
    (v) => typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v)),
  );
  const coverPhoto = firstPhotoId
    ? photos.find((p) => String(p.id) === String(firstPhotoId))
    : null;

  // 문자열 슬롯 값 (텍스트 — 숫자 전용 값 제외)
  const textValues = Object.entries(params)
    .filter(([, v]) => typeof v === 'string' && !/^\d+$/.test(v) && v.trim())
    .map(([, v]) => String(v));

  const primaryText = textValues[0] ?? null;
  const secondaryText = textValues[1] ?? null;

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-900 ${className}`}
      style={{ aspectRatio: '3/4' }}
    >
      {/* 배경: 사진 슬롯의 첫 번째 사진 */}
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

      {/* 템플릿 레이아웃 힌트 오버레이 (반투명) */}
      {templateThumbnailUrl && (
        <img
          src={templateThumbnailUrl}
          alt={templateUid ?? ''}
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          loading="lazy"
        />
      )}

      {/* 텍스트 슬롯 오버레이 — 하단 그라디언트 위에 표시 */}
      {(primaryText || secondaryText) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pt-10 pb-4">
          {primaryText && (
            <h2
              className="font-display text-white text-base lg:text-lg font-semibold leading-tight"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
            >
              {primaryText}
            </h2>
          )}
          {secondaryText && (
            <p
              className="font-display text-white/75 text-xs mt-1 leading-snug"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
            >
              {secondaryText}
            </p>
          )}
        </div>
      )}

      {/* 미리보기 배지 */}
      <div className="absolute top-1.5 right-1.5">
        <span className="text-white/60 text-[10px] bg-black/30 px-1.5 py-0.5 rounded">
          미리보기
        </span>
      </div>

      {/* 디스클레이머 */}
      <div className="absolute bottom-1.5 left-1.5">
        <span className="text-white/40 text-[9px] bg-black/20 px-1 py-0.5 rounded leading-tight">
          실제 인쇄물과 차이 있을 수 있어요
        </span>
      </div>
    </div>
  );
}
