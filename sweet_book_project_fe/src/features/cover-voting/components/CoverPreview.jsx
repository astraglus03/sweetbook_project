export function CoverPreview({
  photoUrl,
  title,
  subtitle,
  templateUid,
  templateThumbnailUrl,
  className = '',
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-900 ${className}`}
      style={{ aspectRatio: '3/4' }}
    >
      {/* 사진 배경 */}
      {photoUrl && (
        <img
          src={photoUrl}
          alt="표지 사진"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* 템플릿 썸네일 오버레이 (반투명) */}
      {templateThumbnailUrl && (
        <img
          src={templateThumbnailUrl}
          alt={templateUid ?? ''}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          loading="lazy"
        />
      )}

      {/* 제목/부제 오버레이 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pt-10 pb-4">
        <h2
          className="font-display text-white text-base lg:text-lg font-semibold leading-tight"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
        >
          {title || '제목 없음'}
        </h2>
        {subtitle && (
          <p
            className="font-display text-white/75 text-xs mt-1 leading-snug"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* 디스클레이머 */}
      <div className="absolute top-1.5 right-1.5">
        <span className="text-white/60 text-[10px] bg-black/30 px-1.5 py-0.5 rounded">
          미리보기
        </span>
      </div>
    </div>
  );
}
